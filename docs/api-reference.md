# API Reference

Base URL: `http://localhost:3001`

## Endpoints

### Health Check

```
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-07-11T07:00:00.000Z"
}
```

---

### Venues

> TODO: Document venue endpoints as they are implemented.

```
GET    /api/venues          — List venues
GET    /api/venues/:id      — Get venue by ID
POST   /api/venues          — Create a venue (host only)
PUT    /api/venues/:id      — Update a venue (host only)
DELETE /api/venues/:id      — Delete a venue (host only)
```

### Bookings

> TODO: Document booking endpoints as they are implemented.

```
GET    /api/bookings        — List user's bookings
POST   /api/bookings        — Create a booking
PATCH  /api/bookings/:id    — Update booking status
```

### Messages

> TODO: Document messaging endpoints as they are implemented.

```
GET    /api/conversations              — List conversations
GET    /api/conversations/:id/messages — Get messages in a conversation
POST   /api/conversations/:id/messages — Send a message
```
