@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ===================================================
echo   CopiwayPRO - Instalacion local (sin dominios .test)
echo ===================================================
echo.

rem ---------------------------------------------------------------
rem 1) Detectar PHP y MySQL de Laragon (cualquier version)
rem ---------------------------------------------------------------
set "PHP_EXE="
set "MYSQL_EXE="

where php >nul 2>nul && set "PHP_EXE=php"
where mysql >nul 2>nul && set "MYSQL_EXE=mysql"

if not defined PHP_EXE (
    for /f "delims=" %%D in ('dir /b /ad /o-n "C:\laragon\bin\php\php-*" 2^>nul') do (
        if not defined PHP_EXE set "PHP_EXE=C:\laragon\bin\php\%%D\php.exe"
    )
)
if not defined MYSQL_EXE (
    for /f "delims=" %%D in ('dir /b /ad /o-n "C:\laragon\bin\mysql\mysql-*" 2^>nul') do (
        if not defined MYSQL_EXE set "MYSQL_EXE=C:\laragon\bin\mysql\%%D\bin\mysql.exe"
    )
)

if not defined PHP_EXE (
    echo [ERROR] No se encontro PHP. Abre Laragon primero, o agrega PHP al PATH de Windows.
    exit /b 1
)
if not defined MYSQL_EXE (
    echo [ERROR] No se encontro el cliente de MySQL. Abre Laragon primero.
    exit /b 1
)

echo   PHP encontrado:      %PHP_EXE%
echo   MySQL encontrado:    %MYSQL_EXE%
echo.

rem ---------------------------------------------------------------
rem 2) Verificar que MySQL de Laragon este activo
rem ---------------------------------------------------------------
echo [1/5] Verificando conexion a MySQL...
"%MYSQL_EXE%" -u root -e "SELECT 1;" >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se pudo conectar a MySQL en 127.0.0.1:3306 con el usuario root.
    echo         Abre Laragon y asegurate de que el servicio MySQL este iniciado.
    exit /b 1
)
echo   OK.
echo.

rem ---------------------------------------------------------------
rem 3) Crear la base de datos e importar el esquema
rem ---------------------------------------------------------------
echo [2/5] Creando/actualizando la base de datos desde database\schema.sql...
"%MYSQL_EXE%" -u root --default-character-set=utf8mb4 < database\schema.sql
if errorlevel 1 (
    echo [ERROR] Fallo al importar database\schema.sql
    exit /b 1
)
echo   OK.
echo.

set /p SEED_ANSWER="Cargar datos de DEMO (productos, staff, clientes de ejemplo)? [s/N]: "
if /i "%SEED_ANSWER%"=="s" (
    echo [2b/5] Cargando database\seed.sql...
    "%MYSQL_EXE%" -u root --default-character-set=utf8mb4 hamburguer_copiway < database\seed.sql
    echo   OK. Usuarios demo: admin@copiway.com / Copiway2024!  ^(cambia la contrasena luego^)
)
echo.

rem ---------------------------------------------------------------
rem 4) Copiar .env
rem ---------------------------------------------------------------
echo [3/5] Preparando .env...
if not exist ".env" (
    copy /y ".env.example" ".env" >nul
    echo   .env creado a partir de .env.example.
) else (
    echo   .env ya existe, no se sobreescribe.
)
echo.

rem ---------------------------------------------------------------
rem 5) Dependencias y build del frontend
rem ---------------------------------------------------------------
echo [4/5] Instalando dependencias del frontend (npm)...
call npm install
if errorlevel 1 (
    echo [ERROR] Fallo npm install
    exit /b 1
)

echo [5/5] Compilando el frontend (npm run build)...
call npm run build
if errorlevel 1 (
    echo [ERROR] Fallo npm run build
    exit /b 1
)
echo.

for %%I in ("%~dp0.") do set "PROJECT_FOLDER=%%~nxI"

echo ===================================================
echo   Instalacion completa.
echo ===================================================
echo.
echo   (Opcional) Crea el primer Administrador con:
echo     "%PHP_EXE%" bin\create-admin.php
echo.
echo   Abre el sitio con cualquiera de estas opciones:
echo     A^) Laragon ^(subcarpeta^):  http://localhost/%PROJECT_FOLDER%/
echo     B^) Servidor embebido:     ejecuta start.bat  -^> http://localhost:8000/
echo.
pause
