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

echo Sirviendo CopiwayPRO en http://localhost:8000/
echo ^(Ctrl+C para detener^)
echo.

"%PHP_EXE%" -S localhost:8000 -t public public\server-router.php
