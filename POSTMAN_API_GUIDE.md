# ScribeCount AuthorFLOW - Postman API Collection

## 📦 Files Included

1. **ScribeCount_AuthorFLOW_API.postman_collection.json** - Complete API collection
2. **ScribeCount_AuthorFLOW_Local.postman_environment.json** - Local development environment

## 🚀 Quick Start

### 1. Import into Postman

#### Import Collection:
1. Open Postman
2. Click **Import** button (top left)
3. Select `ScribeCount_AuthorFLOW_API.postman_collection.json`
4. Click **Import**

#### Import Environment:
1. Click **Import** button again
2. Select `ScribeCount_AuthorFLOW_Local.postman_environment.json`
3. Click **Import**
4. Select "ScribeCount AuthorFLOW - Local" from environment dropdown (top right)

### 2. Start Your Backend

Make sure your backend server is running:
```bash
cd backend/dotnet_migration_pending
dotnet run
```

The API should be available at: `http://localhost:5200` (or check the configured PORT)

**Note:** All API endpoints use the `/api` prefix (e.g., `/api/auth/register`)

### 3. Test the API

Start with the **Authentication** folder:
1. **Register** - Create a new account
2. **Login** - Get your auth token (automatically saved)
3. All other endpoints will use the saved token

## 📚 API Endpoints Overview

### 🔐 Authentication
- **POST** `/api/auth/register` - Register new user (email required, username optional)
- **POST** `/api/auth/login` - Login and get JWT token
- **POST** `/api/auth/forgot-password` - Request password reset
- **POST** `/api/auth/forgot-username` - Request username reminder

### 📝 Plans (Writing Plans)
- **POST** `/api/plans` - Create new writing plan
- **GET** `/api/plans` - Get all plans
- **GET** `/api/plans?id={id}` - Get specific plan
- **GET** `/api/plans/{id}/days` - Get plan activity logs
- **POST** `/api/plans/{id}/days` - Log daily progress
- **PUT** `/api/plans/{id}` - Update plan
- **PATCH** `/api/plans/{id}/archive` - Archive/unarchive plan
- **GET** `/api/plans/archived` - Get archived plans
- **DELETE** `/api/plans?id={id}` - Delete plan

### 📊 Dashboard
- **GET** `/api/dashboard/stats` - Get dashboard overview data

### 📈 Stats
- **GET** `/api/stats` - Get user statistics and analytics

### 💬 Feedback
- **POST** `/api/feedback` - Submit feedback (no auth required)

### 🏆 Challenges
- **GET** `/api/challenges` - Get all writing challenges
- **POST** `/api/challenges/{id}/join` - Join a challenge

### ✅ Checklists
- **GET** `/api/checklists` - Get user checklists
- **POST** `/api/checklists` - Create new checklist

### 👤 User
- **GET** `/api/user/profile` - Get user profile
- **PUT** `/api/user/profile` - Update user profile

### 📧 Newsletter
- **POST** `/api/newsletter/subscribe` - Subscribe to newsletter

## 🔑 Authentication Flow

### Automatic Token Management

The collection includes test scripts that automatically:
1. Extract JWT token from login/register responses
2. Save token to `{{auth_token}}` variable
3. Use token for all authenticated requests

### Manual Token Setup (if needed)

If you need to set a token manually:
1. Click on the collection name
2. Go to **Variables** tab
3. Set `auth_token` value
4. Click **Save**

## 📋 Request Examples

### Register a New User

**Note:** Email is required, username is optional. If username is not provided, it will be auto-generated from the email.

```json
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "username": "testuser"
}
```

**Minimal Request (username auto-generated):**
```json
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

### Create a Writing Plan

```json
POST /api/plans
Authorization: Bearer {{auth_token}}

{
  "title": "My Novel Project",
  "total_word_count": 50000,
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "algorithm_type": "average",
  "description": "Writing my first novel"
}
```

**Response:**
```json
{
  "success": true,
  "planId": 1,
  "message": "Plan created successfully"
}
```

### Log Daily Progress

```json
POST /api/plans/1/days
Authorization: Bearer {{auth_token}}

{
  "date": "2026-01-17",
  "actual_count": 750,
  "notes": "Great writing session today!",
  "target_count": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress logged successfully"
}
```

### Submit Feedback (No Auth Required)

```json
POST /api/feedback

{
  "type": "general",
  "email": "user@example.com",
  "message": "Great application! Love the features."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback! We appreciate your input."
}
```

## 🌍 Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `base_url` | API base URL | `http://localhost:5200` |
| `auth_token` | JWT authentication token | (auto-set on login) |
| `user_id` | Current user ID | (auto-set on login) |

### Switching Environments

To test against different servers:
1. Duplicate the environment
2. Rename it (e.g., "ScribeCount - Production")
3. Update `base_url` to your production URL
4. Switch between environments using the dropdown

## 🧪 Testing Workflow

### Recommended Testing Order:

1. **Authentication**
   - Register → Login
   - Save the token (automatic)

2. **Plans**
   - Create Plan
   - Get All Plans
   - Log Progress
   - Get Plan Days
   - Update Plan
   - Archive Plan

3. **Dashboard & Stats**
   - Get Dashboard Data
   - Get User Stats

4. **Other Features**
   - Submit Feedback
   - Get Challenges
   - Manage Checklists

## 🔧 Troubleshooting

### Token Expired
- Re-run the **Login** request
- Token will be automatically updated

### 401 Unauthorized
- Check if `auth_token` variable is set
- Verify token hasn't expired
- Re-login if necessary

### 404 Not Found
- Verify backend is running on `http://localhost:5200` (or check PORT env variable)
- Check the endpoint URL includes the `/api` prefix (e.g., `/api/auth/register`)
- Ensure you're using the correct HTTP method

### CORS Errors
- Backend should have CORS enabled for `http://localhost:4200`
- Check backend CORS configuration

## 📝 Notes

- **JWT Tokens** expire after a certain period (check backend configuration)
- **Date Format** for plans: `YYYY-MM-DD`
- **Feedback** endpoint doesn't require authentication
- **Plan IDs** are returned when creating plans - save them for updates/deletes

## 🎯 Best Practices

1. **Always test Register/Login first** to get a valid token
2. **Use environment variables** for dynamic values
3. **Save responses** to reference IDs for subsequent requests
4. **Test error cases** by providing invalid data
5. **Keep tokens secure** - don't commit them to version control

## 📞 Support

For issues or questions:
- Email: support@scribecount.com
- Location: ScribeCount, LLC, 248 Nokomis Ave South, Venice FL 34285

---

**Happy Testing! 🚀**

*ScribeCount AuthorFLOW - Your Writing Companion*
