# This takes care of adding and updating monitors for deployments in the Kubernetes cluster. It gets it's data about deployments using Prometheus which has
# metrics about the kubernetes clusters. This DOES NOT take care of adding monitors for other resources / resource types - like daemonsets, statefulsets etc

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

# Dictionary containing URLs and their corresponding prefixes
url_prefix_mapping = {
    "https://prometheus.tools-a-crm-seacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
        "prefix": "seacrm",
        "basic_auth_pass": os.environ['SEACRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-incrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
        "prefix": "incrm",
        "basic_auth_pass": os.environ['INCRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-eucrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
        "prefix": "eucrm",
        "basic_auth_pass": os.environ['EUCRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-asiacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
        "prefix": "asiacrm",
        "basic_auth_pass": os.environ['ASIACRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-tatacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
        "prefix": "tatacrm",
        "basic_auth_pass": os.environ['TATACRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-uscrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
        "prefix": "uscrm",
        "basic_auth_pass": os.environ['USCRM_TOOLS_USER_PASSWORD']
    },
    "https://prometheus.tools-a-crm-ushc-crm.cc.capillarytech.com/api/v1/query?query=kube_deployment_labels": {
        "prefix": "ushc",
        "basic_auth_pass": os.environ['USHC_CRM_TOOLS_USER_PASSWORD']
    },
    # Add more URL-prefix pairs here
}


# Define filtering conditions
filter_conditions = [
    {"prefix": "coredns"},
    {"prefix": "ebs-csi-controller"},
    {"prefix": "efs-csi-controller"},
    {"prefix": "facets-mutating-webhook"},
    # Add more conditions here
]

# In-memory lists to store valid deployment names
existing_deployment_monitors_to_update = []
new_deployment_monitors_to_add = []

print("Processing names of all deployments")

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
        deployments = data["data"]["result"]

        for deployment in deployments:
            deployment_name = deployment["metric"]["deployment"]

            # Apply filtering conditions
            for condition in filter_conditions:
                prefix_condition = condition.get("prefix")
                forbidden_substring = condition.get("forbidden_substring")
                if deployment_name.startswith(prefix_condition):
                    valid_substring = True
                    if forbidden_substring and forbidden_substring in deployment_name:
                        valid_substring = False
                    if valid_substring:
                        full_deployment_name = f"{prefix}-{deployment_name}"
                        if any(monitor['name'] in full_deployment_name for monitor in monitor_info):
                            existing_deployment_monitors_to_update.append(full_deployment_name)
                        else:
                            new_deployment_monitors_to_add.append(full_deployment_name)

# Print the lists of existing and new deployment monitors
print("Existing Deployment Monitors To Update:")
for existing_deployment_monitor in existing_deployment_monitors_to_update:
    print(existing_deployment_monitor)

print("\nNew Deployment Monitors To Add:")
for new_deployment_monitor in new_deployment_monitors_to_add:
    print(new_deployment_monitor)

# Dictionary to store information based on prefixes
prefix_info = {
    "seacrm": {
        "url": "https://prometheus.tools-a-crm-seacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
        "basic_auth_pass": os.environ['SEACRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "coredns": os.environ['SEACRM_OTHERS_PARENT'],
            "ebs-csi-controller": os.environ['SEACRM_OTHERS_PARENT'],
            "efs-csi-controller": os.environ['SEACRM_OTHERS_PARENT'],
            "facets-mutating-webhook": os.environ['SEACRM_OTHERS_PARENT'],
        }
    },
    "incrm": {
        "url": "https://prometheus.tools-a-crm-incrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
        "basic_auth_pass": os.environ['INCRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "coredns": os.environ['INCRM_OTHERS_PARENT'],
            "ebs-csi-controller": os.environ['INCRM_OTHERS_PARENT'],
            "efs-csi-controller": os.environ['INCRM_OTHERS_PARENT'],
            "facets-mutating-webhook": os.environ['INCRM_OTHERS_PARENT'],
        }
    },
    "eucrm": {
        "url": "https://prometheus.tools-a-crm-eucrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
        "basic_auth_pass": os.environ['EUCRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "coredns": os.environ['EUCRM_OTHERS_PARENT'],
            "ebs-csi-controller": os.environ['EUCRM_OTHERS_PARENT'],
            "efs-csi-controller": os.environ['EUCRM_OTHERS_PARENT'],
            "facets-mutating-webhook": os.environ['EUCRM_OTHERS_PARENT'],
        }
    },
    "asiacrm": {
        "url": "https://prometheus.tools-a-crm-asiacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
        "basic_auth_pass": os.environ['ASIACRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "coredns": os.environ['ASIACRM_OTHERS_PARENT'],
            "ebs-csi-controller": os.environ['ASIACRM_OTHERS_PARENT'],
            "efs-csi-controller": os.environ['ASIACRM_OTHERS_PARENT'],
            "facets-mutating-webhook": os.environ['ASIACRM_OTHERS_PARENT'],
        }
    },
    "tatacrm": {
        "url": "https://prometheus.tools-a-crm-tatacrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
        "basic_auth_pass": os.environ['TATACRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "coredns": os.environ['TATACRM_OTHERS_PARENT'],
            "ebs-csi-controller": os.environ['TATACRM_OTHERS_PARENT'],
            "efs-csi-controller": os.environ['TATACRM_OTHERS_PARENT'],
            "facets-mutating-webhook": os.environ['TATACRM_OTHERS_PARENT'],
        }
    },
    "uscrm": {
        "url": "https://prometheus.tools-a-crm-uscrm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
        "basic_auth_pass": os.environ['USCRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "coredns": os.environ['USCRM_OTHERS_PARENT'],
            "ebs-csi-controller": os.environ['USCRM_OTHERS_PARENT'],
            "efs-csi-controller": os.environ['USCRM_OTHERS_PARENT'],
            "facets-mutating-webhook": os.environ['USCRM_OTHERS_PARENT'],
        }
    },
    "ushc": {
        "url": "https://prometheus.tools-a-crm-ushc-crm.cc.capillarytech.com/api/v1/query?query=kube_deployment_status_replicas_ready{deployment=\"<deployment>\"} != kube_deployment_spec_replicas{deployment=\"<deployment>\"}",
        "basic_auth_pass": os.environ['USHC_CRM_TOOLS_USER_PASSWORD'],
        "parent": {
            "coredns": os.environ['USHC_CRM_OTHERS_PARENT'],
            "ebs-csi-controller": os.environ['USHC_CRM_OTHERS_PARENT'],
            "efs-csi-controller": os.environ['USHC_CRM_OTHERS_PARENT'],
            "facets-mutating-webhook": os.environ['USHC_CRM_OTHERS_PARENT'],
        }
    },
    # Add more prefix information as needed
}


# List to store added monitors
added_monitors = []
api = UptimeKumaApi(url=uptime_kuma_uri, timeout=600)
api.login(uptime_kuma_username, uptime_kuma_password)

# Process new deployment monitors
for new_deployment_monitor in new_deployment_monitors_to_add:
    print(f"Processing New Deployment Monitor: {new_deployment_monitor}")
    # Extract prefix from new_deployment_monitor
    prefix = new_deployment_monitor.split("-")[0]

    jsonPath = "($count(data.result) = 0) or ($number(data.result[0].value[1]) > 0)"

    # Check if prefix information is available
    if prefix in prefix_info:
        prefix_data = prefix_info[prefix]
        url_template = prefix_data["url"]
        basic_auth_pass = prefix_data["basic_auth_pass"]
        parent = prefix_data["parent"]

        parent_info = prefix_data.get("parent", {})
        parent = None

        # Check if any keyword in parent_info matches the deployment name
        for keyword, parent_value in parent_info.items():
            if keyword.lower() in new_deployment_monitor:
                parent = parent_value
                break
        # Replace placeholders in the URL template with deployment name
        url = url_template.replace("<deployment>", new_deployment_monitor[len(prefix) + 1:])

        print("Adding New Deployment Monitor:")
        print({
            "type":MonitorType.JSON_QUERY,
            "name":new_deployment_monitor,
            "url":url,
            "jsonPath":jsonPath,
            "jsonPathOperator":"==",
            "expectedValue":"true",
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
                name=new_deployment_monitor,
                url=url,
                jsonPath=jsonPath,
                jsonPathOperator="==",
                expectedValue="true",
                interval=60,
                retryInterval=30,
                authMethod=AuthMethod.HTTP_BASIC,
                basic_auth_user="tools-auser",
                basic_auth_pass=basic_auth_pass,
                parent=parent,
                notificationIDList=[1]
            )

        added_monitors.append(new_deployment_monitor)
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

# Process existing deployments
for existing_deployment_monitor in existing_deployment_monitors_to_update:
    print(f"Processing Existing Deployment Monitor: {existing_deployment_monitor}")
    # Extract prefix from existing_deployment_monitor
    prefix = existing_deployment_monitor.split("-")[0]

    jsonPath = "($count(data.result) = 0) or ($number(data.result[0].value[1]) > 0)"

    # Check if prefix information is available
    if prefix in prefix_info:
        prefix_data = prefix_info[prefix]
        url_template = prefix_data["url"]
        basic_auth_pass = prefix_data["basic_auth_pass"]
        parent = prefix_data["parent"]

        parent_info = prefix_data.get("parent", {})
        parent = None

        # Check if any keyword in parent_info matches the deployment name
        for keyword, parent_value in parent_info.items():
            if keyword.lower() in existing_deployment_monitor:
                parent = parent_value
                break
        # Replace placeholders in the URL template with deployment name
        url = url_template.replace("<deployment>", existing_deployment_monitor[len(prefix) + 1:])

        print("Updating/Editing Existing Deployment Monitor:")
        print({
            "type":MonitorType.JSON_QUERY,
            "name":existing_deployment_monitor,
            "url":url,
            "jsonPath":jsonPath,
            "jsonPathOperator":"==",
            "expectedValue":"true",
            "interval":60,
            "retryInterval":30,
            "authMethod":AuthMethod.HTTP_BASIC,
            "basic_auth_user":"tools-auser",
            "basic_auth_pass":basic_auth_pass,
            "parent":parent,
            "notificationIDList":[1]
        })

        # Update the deployment monitor using the provided edit_monitor code

        api.edit_monitor(
            type=MonitorType.JSON_QUERY,
            name=existing_deployment_monitor,
            url=url,
            jsonPath=jsonPath,
            jsonPathOperator="==",
            expectedValue="true",
            interval=60,
            retryInterval=30,
            authMethod=AuthMethod.HTTP_BASIC,
            basic_auth_user="tools-auser",
            basic_auth_pass=basic_auth_pass,
            parent=parent,
            notificationIDList=[1]
        )

        updated_monitors.append(existing_deployment_monitor)
    else:
        print(f"No information found for prefix: {prefix}")

api.disconnect()

# Print updated monitors
print("Updated Monitors:")
for monitor in updated_monitors:
    print(monitor)

