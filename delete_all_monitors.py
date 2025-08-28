from uptime_kuma_api import UptimeKumaApi
import time

api = UptimeKumaApi('http://localhost:3001')

api.login('admin', 'admin123')

list_of_monitors = api.get_monitors()

ids_of_monitors = list(map(lambda monitor: monitor["id"], list_of_monitors))

# Only v2.0.0-beta.3 does not have any data. It's brand new. And it's okay to delete all the monitors in it in case some importing issue happened,
# some failure happened etc, when importing from v1.23.1. No one is adding new monitors to v2.0.0-beta.3 so, we can just delete the data for now.
# Or, we can import the data before deleting the data :D We can do that!

raise Exception("Please ensure you are connected to the v2.0.0-beta.3 version of Uptime Kuma. Please comment this line in the source code to proceed")

# Importing the data before deleting the data
with open(f"liat-of-monitors-{time.time_ns()}.json", "w") as dump_file:
    json.dump(list_of_monitors, dump_file)

# Double checking the server version before deleting all the monitors
if api.version == '2.0.0-beta.3':
    for id in ids_of_monitors:
        api.delete_monitor(id)
