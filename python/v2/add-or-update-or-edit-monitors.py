# This takes care of adding monitors for statefulsets in the Kubernetes cluster. It gets it's data about statefulsets using Prometheus which has
# metrics about the kubernetes clusters. This DOES NOT take care of adding monitors for other resources / resource types - like daemonsets, deployments etc

import requests
import os
import base64
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

url_prefix_mapping = {
    "https://prometheus.tools-a-crm-seacrm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "seacrm",
        "basic_auth_pass": os.environ['SEACRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-incrm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "incrm",
        "basic_auth_pass": os.environ['INCRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-eucrm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "eucrm",
        "basic_auth_pass": os.environ['EUCRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-asiacrm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "asiacrm",
        "basic_auth_pass": os.environ['ASIACRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-tatacrm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "tatacrm",
        "basic_auth_pass": os.environ['TATACRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-uscrm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "uscrm",
        "basic_auth_pass": os.environ['USCRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-ushc-crm.cc.capillarytech.com/api/v1/query?query=kube_statefulset_labels": {
        "prefix": "ushc",
        "basic_auth_pass": os.environ['USHC_CRM_TOOLS_USER_PASSWORD']
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
existing_statefulset_monitors_to_update = []
new_statefulset_monitors_to_add = []

# Process each URL
for url, config in url_prefix_mapping.items():
    print(f"Processing URL: {url}")
    prefix = config.get("prefix", "")
    basic_auth_pass = config.get("basic_auth_pass")
    basic_auth = f"tools-auser:{basic_auth_pass}"
    basic_auth_bytes = basic_auth.encode("utf-8")
    auth_prefix_bytes = base64.b64encode(basic_auth_bytes)
    auth_prefix = auth_prefix_bytes.decode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth_prefix}"
    }

    response = requests.get(url, headers=headers)
    data = response.json()

    print(f"Response for {url}:")
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
                            existing_statefulset_monitors_to_update.append(full_statefulset_name)
                        else:
                            new_statefulset_monitors_to_add.append(full_statefulset_name)

# Print the lists of existing and new statefulset monitors
print("Existing StatefulSet Monitors To Update:")
for existing_statefulset_monitor in existing_statefulset_monitors_to_update:
    print(existing_statefulset_monitor)

print("\nNew StatefulSet Monitors To Add:")
for new_statefulset_monitor in new_statefulset_monitors_to_add:
    print(new_statefulset_monitor)

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
    "incrm": {
        "url": "https://prometheus.tools-a-crm-incrm.cc.capillarytech.com/api/v1/query?query=scalar(kube_statefulset_status_replicas_ready{statefulset=\"<statefulset>\"} == kube_statefulset_replicas{statefulset=\"<statefulset>\"})",
        "basic_auth_pass": os.environ['INCRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "redis": os.environ['INCRM_REDIS_PARENT'],
            "mongo": os.environ['INCRM_MONGO_PARENT'],
            "rmq" : os.environ['INCRM_RABBITMQ_PARENT'],
            "elasticsearch": os.environ['INCRM_ELASTICSEARCH_PARENT'],
            "events": os.environ['INCRM_KAFKA_PARENT'],
            "ptmysqlhotswap": os.environ['INCRM_DEVELOPER_TOOLS_PARENT'],
            "wetty": os.environ['INCRM_DEVELOPER_TOOLS_PARENT'],
            "zk-": os.environ['INCRM_OTHERS_PARENT'],
            "emigran": os.environ['INCRM_OTHERS_PARENT'],
            "neo4j": os.environ['INCRM_OTHERS_PARENT'],
        }
    },
    "eucrm": {
        "url": "https://prometheus.tools-a-crm-eucrm.cc.capillarytech.com/api/v1/query?query=scalar(kube_statefulset_status_replicas_ready{statefulset=\"<statefulset>\"} == kube_statefulset_replicas{statefulset=\"<statefulset>\"})",
        "basic_auth_pass": os.environ['EUCRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "redis": os.environ['EUCRM_REDIS_PARENT'],
            "mongo": os.environ['EUCRM_MONGO_PARENT'],
            "rmq" : os.environ['EUCRM_RABBITMQ_PARENT'],
            "elasticsearch": os.environ['EUCRM_ELASTICSEARCH_PARENT'],
            "events": os.environ['EUCRM_KAFKA_PARENT'],
            "ptmysqlhotswap": os.environ['EUCRM_DEVELOPER_TOOLS_PARENT'],
            "wetty": os.environ['EUCRM_DEVELOPER_TOOLS_PARENT'],
            "zk-": os.environ['EUCRM_OTHERS_PARENT'],
            "emigran": os.environ['EUCRM_OTHERS_PARENT'],
            "neo4j": os.environ['EUCRM_OTHERS_PARENT'],
        }
    },
    "asiacrm": {
        "url": "https://prometheus.tools-a-crm-asiacrm.cc.capillarytech.com/api/v1/query?query=scalar(kube_statefulset_status_replicas_ready{statefulset=\"<statefulset>\"} == kube_statefulset_replicas{statefulset=\"<statefulset>\"})",
        "basic_auth_pass": os.environ['ASIACRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "redis": os.environ['ASIACRM_REDIS_PARENT'],
            "mongo": os.environ['ASIACRM_MONGO_PARENT'],
            "rmq" : os.environ['ASIACRM_RABBITMQ_PARENT'],
            "elasticsearch": os.environ['ASIACRM_ELASTICSEARCH_PARENT'],
            "events": os.environ['ASIACRM_KAFKA_PARENT'],
            "ptmysqlhotswap": os.environ['ASIACRM_DEVELOPER_TOOLS_PARENT'],
            "wetty": os.environ['ASIACRM_DEVELOPER_TOOLS_PARENT'],
            "zk-": os.environ['ASIACRM_OTHERS_PARENT'],
            "emigran": os.environ['ASIACRM_OTHERS_PARENT'],
            "neo4j": os.environ['ASIACRM_OTHERS_PARENT'],
        }
    },
    "tatacrm": {
        "url": "https://prometheus.tools-a-crm-tatacrm.cc.capillarytech.com/api/v1/query?query=scalar(kube_statefulset_status_replicas_ready{statefulset=\"<statefulset>\"} == kube_statefulset_replicas{statefulset=\"<statefulset>\"})",
        "basic_auth_pass": os.environ['TATACRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "redis": os.environ['TATACRM_REDIS_PARENT'],
            "mongo": os.environ['TATACRM_MONGO_PARENT'],
            "rmq" : os.environ['TATACRM_RABBITMQ_PARENT'],
            "elasticsearch": os.environ['TATACRM_ELASTICSEARCH_PARENT'],
            "events": os.environ['TATACRM_KAFKA_PARENT'],
            "ptmysqlhotswap": os.environ['TATACRM_DEVELOPER_TOOLS_PARENT'],
            "wetty": os.environ['TATACRM_DEVELOPER_TOOLS_PARENT'],
            "zk-": os.environ['TATACRM_OTHERS_PARENT'],
            "emigran": os.environ['TATACRM_OTHERS_PARENT'],
            "neo4j": os.environ['TATACRM_OTHERS_PARENT'],
        }
    },
    "uscrm": {
        "url": "https://prometheus.tools-a-crm-uscrm.cc.capillarytech.com/api/v1/query?query=scalar(kube_statefulset_status_replicas_ready{statefulset=\"<statefulset>\"} == kube_statefulset_replicas{statefulset=\"<statefulset>\"})",
        "basic_auth_pass": os.environ['USCRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "redis": os.environ['USCRM_REDIS_PARENT'],
            "mongo": os.environ['USCRM_MONGO_PARENT'],
            "rmq" : os.environ['USCRM_RABBITMQ_PARENT'],
            "elasticsearch": os.environ['USCRM_ELASTICSEARCH_PARENT'],
            "events": os.environ['USCRM_KAFKA_PARENT'],
            "ptmysqlhotswap": os.environ['USCRM_DEVELOPER_TOOLS_PARENT'],
            "wetty": os.environ['USCRM_DEVELOPER_TOOLS_PARENT'],
            "zk-": os.environ['USCRM_OTHERS_PARENT'],
            "emigran": os.environ['USCRM_OTHERS_PARENT'],
            "neo4j": os.environ['USCRM_OTHERS_PARENT'],
        }
    },
    "ushc": {
        "url": "https://prometheus.tools-a-crm-ushc-crm.cc.capillarytech.com/api/v1/query?query=scalar(kube_statefulset_status_replicas_ready{statefulset=\"<statefulset>\"} == kube_statefulset_replicas{statefulset=\"<statefulset>\"})",
        "basic_auth_pass": os.environ['USHC_CRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "redis": os.environ['USHC_CRM_REDIS_PARENT'],
            "mongo": os.environ['USHC_CRM_MONGO_PARENT'],
            "rmq" : os.environ['USHC_CRM_RABBITMQ_PARENT'],
            "elasticsearch": os.environ['USHC_CRM_ELASTICSEARCH_PARENT'],
            "events": os.environ['USHC_CRM_KAFKA_PARENT'],
            "ptmysqlhotswap": os.environ['USHC_CRM_DEVELOPER_TOOLS_PARENT'],
            "wetty": os.environ['USHC_CRM_DEVELOPER_TOOLS_PARENT'],
            "zk-": os.environ['USHC_CRM_OTHERS_PARENT'],
            "emigran": os.environ['USHC_CRM_OTHERS_PARENT'],
            "neo4j": os.environ['USHC_CRM_OTHERS_PARENT'],
        }
    },
    # Add more prefix information as needed
}

# List of words to check for in new_statefulset_monitor name
jsonPath_words = ["events-", "elasticsearch-", "zk-"]


# List to store added monitors
added_monitors = []
api = UptimeKumaApi(url=uptime_kuma_uri, timeout=600)
api.login(uptime_kuma_username, uptime_kuma_password)

# Process new statefulset monitors
for new_statefulset_monitor in new_statefulset_monitors_to_add:
    print(f"Processing New StatefulSet Monitor: {new_statefulset_monitor}")

    # Extract prefix from new_statefulset_monitor
    prefix = new_statefulset_monitor.split("-")[0]

    # Determine jsonPath value based on presence of specific words
    if any(word in new_statefulset_monitor for word in jsonPath_words):
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
            if keyword.lower() in new_statefulset_monitor:
                parent = parent_value
                break
        # Replace placeholders in the URL template with statefulset name
        url = url_template.replace("<statefulset>", new_statefulset_monitor[len(prefix) + 1:])

        print("Adding New StatefulSet Monitor:")
        print({
            "type":MonitorType.JSON_QUERY,
            "name":new_statefulset_monitor,
            "url":url,
            "jsonPath":jsonPath,
            "jsonPathOperator":"==",
            "expectedValue":"false",
            "interval":60,
            "retryInterval":30,
            "authMethod":AuthMethod.HTTP_BASIC,
            "basic_auth_user":"tools-auser",
            "basic_auth_pass":basic_auth_pass,
            "parent":parent,
            "notificationIDList":[1]
        })

        # Add the monitor using the provided add_monitor code

        api.add_monitor(
                type=MonitorType.JSON_QUERY,
                name=new_statefulset_monitor,
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

        added_monitors.append(new_statefulset_monitor)
    else:
        print(f"No information found for prefix: {prefix}")

api.disconnect()

# Print added monitors
print("Added Monitors:")
for monitor in added_monitors:
    print(monitor)

# List to store updated monitors
updated_monitors = []
api = UptimeKumaApi(url=uptime_kuma_uri, timeout=600)
api.login(uptime_kuma_username, uptime_kuma_password)

# Process existing statefulset monitors
for existing_statefulset_monitor in existing_statefulset_monitors_to_update:
    print(f"Processing Existing StatefulSet Monitor: {existing_statefulset_monitor}")

    # Extract prefix from existing_statefulset_monitor
    prefix = existing_statefulset_monitor.split("-")[0]

    # Determine jsonPath value based on presence of specific words
    if any(word in existing_statefulset_monitor for word in jsonPath_words):
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
            if keyword.lower() in existing_statefulset_monitor:
                parent = parent_value
                break
        # Replace placeholders in the URL template with statefulset name
        url = url_template.replace("<statefulset>", existing_statefulset_monitor[len(prefix) + 1:])

        print("Updating/Editing Existing StatefulSet Monitor:")
        print({
            "type":MonitorType.JSON_QUERY,
            "name":existing_statefulset_monitor,
            "url":url,
            "jsonPath":jsonPath,
            "jsonPathOperator":"==",
            "expectedValue":"false",
            "interval":60,
            "retryInterval":30,
            "authMethod":AuthMethod.HTTP_BASIC,
            "basic_auth_user":"tools-auser",
            "basic_auth_pass":basic_auth_pass,
            "parent":parent,
            "notificationIDList":[1]
        })

        # Edit the statefulset monitor using the provided edit_monitor code

        api.edit_monitor(
                type=MonitorType.JSON_QUERY,
                name=existing_statefulset_monitor,
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

        updated_monitors.append(existing_statefulset_monitor)
    else:
        print(f"No information found for prefix: {prefix}")

api.disconnect()

# Print updated monitors
print("Updated Monitors:")
for monitor in updated_monitors:
    print(monitor)
