<?php

namespace App\Core;

class Request
{
    private array $query;
    private array $body;
    private array $server;
    public readonly string $method;
    public readonly string $path;
    public array $params = [];

    public function __construct()
    {
        $this->query = $_GET;
        $this->server = $_SERVER;
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $rawPath = parse_url($uri, PHP_URL_PATH) ?: '/';
        $rawPath = BasePath::strip($rawPath);
        $this->path = rtrim($rawPath, '/') ?: '/';

        $this->body = $this->parseBody();
    }

    private function parseBody(): array
    {
        if (in_array($this->method, ['GET', 'HEAD'], true)) {
            return [];
        }

        $contentType = $this->server['CONTENT_TYPE'] ?? '';
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw ?: '[]', true);
            return is_array($decoded) ? $decoded : [];
        }

        return $_POST;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function all(): array
    {
        return array_merge($this->query, $this->body);
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function header(string $key): ?string
    {
        $key = 'HTTP_' . str_replace('-', '_', strtoupper($key));
        return $this->server[$key] ?? null;
    }

    public function ip(): string
    {
        foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'] as $key) {
            if (!empty($this->server[$key])) {
                $ip = explode(',', $this->server[$key])[0];
                return trim($ip);
            }
        }
        return '0.0.0.0';
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('Authorization');
        if ($auth && preg_match('/Bearer\s+(.*)$/i', $auth, $m)) {
            return $m[1];
        }
        return null;
    }
}
