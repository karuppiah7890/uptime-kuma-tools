from uptime_kuma_api import UptimeKumaApi
import time
import json

api = UptimeKumaApi('http://localhost:3001')

api.login('admin', 'admin123')

list_of_monitors = api.get_monitors()

# Importing the data before deleting the data
with open(f"list-of-monitors-{time.time_ns()}.json", "w") as dump_file:
    json.dump(list_of_monitors, dump_file)
