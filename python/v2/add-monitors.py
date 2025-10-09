# This takes care of adding monitors for statefulsets in the Kubernetes cluster. It gets it's data about statefulsets using Prometheus which has
# metrics about the kubernetes clusters. This DOES NOT take care of adding monitors for other resources / resource types - like daemonsets, deployments etc

import requests
import os
from uptime_kuma_api import UptimeKumaApi, MonitorType, AuthMethod

uptime_kuma_uri = os.environ['UPTIME_KUMA_URI']
uptime_kuma_username = os.environ['UPTIME_KUMA_USERNAME']
uptime_kuma_password = os.environ['UPTIME_KUMA_PASSWORD']

# Uptime Kuma API initialization
api = UptimeKumaApi(url=uptime_kuma_uri, timeout=600)
api.login(uptime_kuma_username, uptime_kuma_password)
monitors = api.get_monitors()
api.disconnect()  # Disconnect from the Uptime Kuma API

# Get monitor names and IDs from Uptime Kuma API
monitor_info = [{'name': monitor['name'], 'id': monitor['id']} for monitor in monitors]

# Dictionary containing URLs and their corresponding prefixes
url_prefix_mapping = {
    "https://prometheus.tools-a-crm-seacrm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "seacrm",
        "auth_prefix": os.environ['SEACRM_TOOLS_USER_AUTH']
    },
    # Add more URL-prefix pairs here
}


# Define filtering conditions
filter_conditions = [
    {"prefix": "redisk8s", "forbidden_substring": "slave"},
    {"prefix": "rmq"},
    {"prefix": "events-"},
    {"prefix": "elasticsearch-"},
    {"prefix": "ptmysqlhotswap"},
    {"prefix": "zk-"},
    {"prefix": "emigran"},
    {"prefix": "neo4j"},
    {"prefix": "mongo"}
    # Add more conditions here
]

# In-memory lists to store valid statefulset names
matching_statefulsets = []
non_matching_statefulsets = []

# Process each URL
for url, config in url_prefix_mapping.items():
    prefix = config.get("prefix", "")
    auth_prefix = config.get("auth_prefix")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth_prefix}"
    }

    response = requests.get(url, headers=headers)
    data = response.json()

    print(f"Response for {url}")
    print(data)

    if "data" in data and "result" in data["data"]:
        statefulsets = data["data"]["result"]

        for statefulset in statefulsets:
            statefulset_name = statefulset["metric"]["statefulset"]

            # Apply filtering conditions
            for condition in filter_conditions:
                prefix_condition = condition.get("prefix")
                forbidden_substring = condition.get("forbidden_substring")
                if statefulset_name.startswith(prefix_condition):
                    valid_substring = True
                    if forbidden_substring and forbidden_substring in statefulset_name:
                        valid_substring = False
                    if valid_substring:
                        full_statefulset_name = f"{prefix}-{statefulset_name}"
                        if any(monitor['name'] in full_statefulset_name for monitor in monitor_info):
                            matching_statefulsets.append(full_statefulset_name)
                        else:
                            non_matching_statefulsets.append(full_statefulset_name)

# Print the lists of matching and non-matching statefulsets
print("Matching StatefulSets:")
for matching_statefulset in matching_statefulsets:
    print(matching_statefulset)

print("\nNon-Matching StatefulSets:")
for non_matching_statefulset in non_matching_statefulsets:
    print(non_matching_statefulset)

# Dictionary to store information based on prefixes
prefix_info = {
    "seacrm": {
        "url": "https://prometheus.tools-a-crm-seacrm.cc.capillarytech.com/api/v1/query?query=scalar(kube_statefulset_status_replicas_ready{statefulset=\"<statefulset>\"} == kube_statefulset_replicas{statefulset=\"<statefulset>\"})",
        "basic_auth_pass": os.environ['SEACRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "redis": os.environ['SEACRM_REDIS_PARENT'],
            "mongo": os.environ['SEACRM_MONGO_PARENT'],
            "rmq" : os.environ['SEACRM_RABBITMQ_PARENT'],
            "elasticsearch": os.environ['SEACRM_ELASTICSEARCH_PARENT'],
            "events": os.environ['SEACRM_KAFKA_PARENT'],
            "ptmysqlhotswap": os.environ['SEACRM_DEVELOPER_TOOLS_PARENT'],
            "wetty": os.environ['SEACRM_DEVELOPER_TOOLS_PARENT'],
            "zk-": os.environ['SEACRM_OTHERS_PARENT'],
            "emigran": os.environ['SEACRM_OTHERS_PARENT'],
            "neo4j": os.environ['SEACRM_OTHERS_PARENT'],
        }
    },
    # Add more prefix information as needed
}

# List of words to check for in non_matching_statefulset name
jsonPath_words = ["events-", "elasticsearch-", "zk-"]


# List to store added monitors
added_monitors = []
api = UptimeKumaApi(url=uptime_kuma_uri, timeout=600)
api.login(uptime_kuma_username, uptime_kuma_password)

# Process non-matching statefulsets
for non_matching_statefulset in non_matching_statefulsets:
    # Extract prefix from non_matching_statefulset
    prefix = non_matching_statefulset.split("-")[0]

    # Determine jsonPath value based on presence of specific words
    if any(word in non_matching_statefulset for word in jsonPath_words):
        jsonPath = "($number(data.result[1]) in [0 ,1])"
    else:
        jsonPath = "($number(data.result[1]) = 0)"

    # Check if prefix information is available
    if prefix in prefix_info:
        prefix_data = prefix_info[prefix]
        url_template = prefix_data["url"]
        basic_auth_pass = prefix_data["basic_auth_pass"]
        parent = prefix_data["parent"]

        parent_info = prefix_data.get("parent", {})
        parent = None

        # Check if any keyword in parent_info matches the statefulset name
        for keyword, parent_value in parent_info.items():
            if keyword.lower() in non_matching_statefulset:
                parent = parent_value
                break
        # Replace placeholders in the URL template with statefulset name
        url = url_template.replace("<statefulset>", non_matching_statefulset[len(prefix) + 1:])

        # Add the monitor using the provided add_monitor code

        api.add_monitor(
                type=MonitorType.JSON_QUERY,
                name=non_matching_statefulset,
                url=url,
                jsonPath=jsonPath,
                jsonPathOperator="==",
                expectedValue="false",
                interval=60,
                retryInterval=30,
                authMethod=AuthMethod.HTTP_BASIC,
                basic_auth_user="tools-auser",
                basic_auth_pass=basic_auth_pass,
                parent=parent,
                notificationIDList=[1]
            )

        added_monitors.append(non_matching_statefulset)
    else:
        print(f"No information found for prefix: {prefix}")

api.disconnect()

# Print added monitors
print("Added Monitors:")
for monitor in added_monitors:
    print(monitor)
