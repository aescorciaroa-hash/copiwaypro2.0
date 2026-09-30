@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem Sirve CopiwayPRO con el servidor embebido de PHP en http://localhost:8000/
rem sin Apache, sin host virtual y sin dominios .test.

set "PHP_EXE="
where php >nul 2>nul && set "PHP_EXE=php"

if not defined PHP_EXE (
    for /f "delims=" %%D in ('dir /b /ad /o-n "C:\laragon\bin\php\php-*" 2^>nul') do (
        if not defined PHP_EXE set "PHP_EXE=C:\laragon\bin\php\%%D\php.exe"
    )
)

if not defined PHP_EXE (
    echo [ERROR] No se encontro PHP. Abre Laragon primero, o agrega PHP al PATH de Windows.
    pause
    exit /b 1
)

if not exist "public\index.html" (
    echo [AVISO] El frontend aun no esta compilado. Ejecuta install.bat o "npm run build" primero.
)

rem Windows (Laragon) no trae de fabrica el openssl.cnf en la ruta que OpenSSL
rem busca por defecto: openssl_pkey_new() con curvas EC (necesario para VAPID,
rem las notificaciones push) falla en silencio sin esto. OPENSSL_CONF debe
rem existir en el entorno ANTES de que arranque php.exe (un putenv() dentro de
rem PHP ya es demasiado tarde), asi que se fija aqui, no en el codigo PHP.
if not defined OPENSSL_CONF (
    for %%F in ("%PHP_EXE%") do set "PHP_DIR=%%~dpF"
    if exist "!PHP_DIR!extras\ssl\openssl.cnf" (
        set "OPENSSL_CONF=!PHP_DIR!extras\ssl\openssl.cnf"
    )
)

echo Sirviendo CopiwayPRO en http://localhost:8000/
echo ^(Ctrl+C para detener^)
echo.

"%PHP_EXE%" -S localhost:8000 -t public public\server-router.php
