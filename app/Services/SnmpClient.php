<?php

namespace App\Services;

class SnmpClient
{
    protected string $host;
    protected string $community;
    protected int $port;
    protected int $timeout;    // dalam mikrodetik (1 detik = 1.000.000)
    protected int $retries;

    /**
     * Constructor dengan parameter opsional
     */
    public function __construct(
        string $host = '127.0.0.1',
        string $community = 'public',
        int $port = 1161,
        int $timeout = 1000000,   // 1 detik
        int $retries = 1
    ) {
        $this->host = $host;
        $this->community = $community;
        $this->port = $port;
        $this->timeout = $timeout;
        $this->retries = $retries;
    }

    /**
     * Ambil satu nilai OID (snmpget)
     */
    public function get(string $oid): ?string
    {
        $target = $this->getTarget();

        // @ untuk suppress warning jika timeout/gagal
        $result = @snmpget(
            $target,
            $this->community,
            $oid,
            $this->timeout,
            $this->retries
        );

        if ($result === false) {
            return null;
        }

        // Parse hasil: "STRING: nilai" -> ambil bagian setelah ": "
        if (preg_match('/:\s+(.+)$/', $result, $matches)) {
            return trim($matches[1]);
        }

        return trim($result);
    }

    /**
     * Ambil banyak OID sekaligus (snmpwalk)
     * Hati-hati: bisa return array besar!
     */
    public function walk(string $oid): array
    {
        $target = $this->getTarget();

        $results = @snmpwalk(
            $target,
            $this->community,
            $oid,
            $this->timeout,
            $this->retries
        );

        if ($results === false) {
            return [];
        }

        $parsed = [];
        foreach ($results as $key => $value) {
            if (preg_match('/:\s+(.+)$/', $value, $matches)) {
                $parsed[$key] = trim($matches[1]);
            } else {
                $parsed[$key] = trim($value);
            }
        }

        return $parsed;
    }

    /**
     * Ubah target koneksi (fluent setter)
     */
    public function setHost(string $host): self
    {
        $this->host = $host;
        return $this;
    }

    public function setCommunity(string $community): self
    {
        $this->community = $community;
        return $this;
    }

    public function setPort(int $port): self
    {
        $this->port = $port;
        return $this;
    }

    /**
     * Gabungkan host:port
     */
    protected function getTarget(): string
    {
        return "{$this->host}:{$this->port}";
    }
}