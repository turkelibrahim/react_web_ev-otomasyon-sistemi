# Shared module contracts

These are Phase 0 design conventions and planned interfaces, not implemented business endpoints or behavior. The contracts can evolve with the team.

## JSON API conventions

Use `/api` as the base path, JSON request and response bodies, `Content-Type: application/json`, camelCase field names, and numeric IDs. Successful responses use appropriate HTTP status codes; errors use a non-2xx status and `{ "error": "message" }`. `GET /api/health` currently returns `{ "status": "ok" }`. Business endpoints below are planned only.

## Device

A device representation is planned as `{ "id": 1, "userId": 1, "deviceTypeId": 1, "name": "Hall light", "state": {}, "createdAt": "2026-01-01T12:00:00.000Z" }`. `state` is a JSON object whose fields depend on device type. Device types are identified by the codes `LIGHT`, `THERMOSTAT`, `DOOR_LOCK`, and `MOTION_SENSOR`.

Proposed state and action vocabulary, subject to implementation decisions:

| Type | Example state | Example action |
| --- | --- | --- |
| LIGHT | `{ "on": true }` | `{ "type": "SET_POWER", "on": false }` |
| THERMOSTAT | `{ "temperatureC": 21 }` | `{ "type": "SET_TEMPERATURE", "temperatureC": 22 }` |
| DOOR_LOCK | `{ "locked": true }` | `{ "type": "SET_LOCK", "locked": false }` |
| MOTION_SENSOR | `{ "motionDetected": false }` | No actuator action proposed; sensor events report motion. |

## Automation

A planned automation representation has `id`, `userId`, target `deviceId`, `name`, boolean `enabled`, `triggerType`, `trigger`, `action`, and `createdAt`. `trigger` and `action` are JSON objects. `triggerType` is `TIME` or `EVENT`.

- `TIME`: for example, `{ "at": "2026-01-01T12:00:00.000Z" }` specifies an instant.
- `EVENT`: for example, `{ "deviceId": 2, "event": "MOTION_DETECTED" }` identifies a source device and event.

The action uses the target device's vocabulary above. Trigger interpretation, scheduling, validation and execution are future work.

## Planned REST endpoints

- Auth and users: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me`.
- Device types and devices: `GET /api/device-types`; `GET` and `POST /api/devices`; `GET`, `PATCH`, and `DELETE /api/devices/:id`.
- Automations: `GET` and `POST /api/automations`; `GET`, `PATCH`, and `DELETE /api/automations/:id`.
- Notifications: `GET /api/notifications`, `PATCH /api/notifications/:id`.
- Admin and logs: `GET /api/admin/users`, `GET /api/admin/activity-logs`.

## Ownership

- Bejan: Auth, Admin and shared integration.
- Melike: Devices.
- İbrahim: Automations and Notifications.

## Naming and time

Use camelCase in JSON and JavaScript, snake_case for database columns, and uppercase codes for device types, trigger types and action types. Store timestamps as ISO 8601 UTC strings with `Z`; exchange instants in UTC and convert for display in the user's local timezone. A future recurring local-time schedule must carry an explicit IANA timezone and define daylight-saving behavior.