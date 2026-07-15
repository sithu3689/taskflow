# TaskFlow API Documentation

## Overview

This document describes the REST API endpoints used by the TaskFlow Project Management System.

**Base URL**

```
http://localhost:5000/api/v1
```


# Authentication

## Login

**Endpoint**

```
POST /api/v1/auth/login
```

**Description**

Authenticates a user and returns a JWT access token.


# Dashboard

## Get Dashboard Data

**Endpoint**

```
GET /api/v1/dashboard
```

**Description**

Returns dashboard statistics such as projects, tasks, users and completion progress.


# Users

## Get All Users

```
GET /api/v1/users
```

Returns all users.


## Create User

```
POST /api/v1/users
```

Creates a new user.


## Update User

```
PUT /api/v1/users/{id}
```

Updates user details.


## Delete User

```
DELETE /api/v1/users/{id}
```

Deletes a user.


# Projects

## Get All Projects

```
GET /api/v1/projects
```

Returns all projects.


## Create Project

```
POST /api/v1/projects
```

Creates a new project.


## Update Project

```
PUT /api/v1/projects/{id}
```

Updates project information.


## Delete Project

```
DELETE /api/v1/projects/{id}
```

Deletes a project.


# Tasks

## Get All Tasks

```
GET /api/v1/tasks
```

Returns all tasks.


## Create Task

```
POST /api/v1/tasks
```

Creates a new task.


## Update Task

```
PUT /api/v1/tasks/{id}
```

Updates a task.


## Delete Task

```
DELETE /api/v1/tasks/{id}
```

Deletes a task.


# Authentication

All protected endpoints require a JWT Bearer Token.

Example:

```
Authorization: Bearer <your_jwt_token>
```