# Word Tracker Backend (C#)

This is the migrated C# ASP.NET Core backend for Word Tracker.

## Prerequisites

1.  **.NET 8.0 SDK**: [Download here](https://dotnet.microsoft.com/download/dotnet/8.0).
2.  **MySQL**: Ensure MySQL is running on localhost:3306 (default user `root`, no password, or configure in `appsettings.json`).

## Setup & Run

### Windows (Cmd/PowerShell)

1.  **Build**:
    ```cmd
    build.bat
    ```

2.  **Run**:
    ```cmd
    run.bat
    ```

The server will start on `http://localhost:8080`.

## Configuration

Edit `appsettings.json` to configure:
- Database connection string (`ConnectionStrings:Default`).
- JWT Secret (`Jwt:Secret`).
- Listening port (`Kestrel:Endpoints:Http:Url`).

## Legacy Code

The original C backend code has been moved to the `legacy_c` directory.
