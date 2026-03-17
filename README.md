# NGINX — Complete Guide for DevOps Engineers

> Web Server · Reverse Proxy · Load Balancer · SSL Termination

---

## Table of Contents

1. [What is a Web Server?](#1-what-is-a-web-server)
2. [Traditional Web Server Problems](#2-traditional-web-server-problems)
3. [NGINX Architecture](#3-nginx-architecture)
4. [NGINX Request Flow](#4-nginx-request-flow)
5. [Installing NGINX on Ubuntu](#5-installing-nginx-on-ubuntu)
6. [Project 1 — Serving a Static Website](#6-project-1--serving-a-static-website)
7. [Project 2 — NGINX as a Reverse Proxy](#7-project-2--nginx-as-a-reverse-proxy)
8. [Project 3 — NGINX as a Load Balancer](#8-project-3--nginx-as-a-load-balancer)
9. [SSL/TLS Setup with Self-Signed Certificate](#9-ssltls-setup-with-self-signed-certificate)
10. [Load Balancing Algorithms](#10-load-balancing-algorithms)
11. [NGINX vs Apache](#11-nginx-vs-apache)
12. [Common DevOps Use Cases](#12-common-devops-use-cases)
13. [NGINX File Structure](#13-nginx-file-structure)
14. [Docker Demo](#14-docker-demo)

---

## 1. What is a Web Server?

A **web server** is software (or hardware) that:

- Receives HTTP requests from clients (browser / API)
- Finds the requested resources (HTML, CSS, images, etc.)
- Sends them back as a response

**Examples:** Apache, NGINX

---

## 2. Traditional Web Server Problems

### Process-Based Model

| Aspect | Detail |
|---|---|
| How it works | Each request spawns a new process |
| Memory | Each process uses separate memory |
| Problem | High memory usage — system crashes under load |

```
10,000 users → 10,000 processes → 💥 crash
```

### Thread-Based Model

| Aspect | Detail |
|---|---|
| How it works | One process, multiple threads |
| Improvement | Less memory than processes |
| Still a problem | Threads also consume memory — high concurrency still crashes |

### The C10K Problem

> **C10K** = handling **10,000 concurrent connections**

Traditional servers struggle due to:
- Memory overhead per process/thread
- Context-switching cost
- OS scheduling limits

---

## 3. NGINX Architecture

### Key Idea: Event-Driven + Asynchronous

### Restaurant Analogy

| Model | Behavior |
|---|---|
| **Old (Apache)** | One waiter per customer — waiter sits idle between orders |
| **NGINX** | One waiter handles multiple customers — moves between them, responds only when needed |

### Key Concepts

| Concept | Meaning |
|---|---|
| **Event-Driven** | Acts only when something happens (request arrives, data ready) |
| **Asynchronous** | Doesn't wait — handles other requests while waiting for I/O |

### Worker Process Model

NGINX spawns worker processes based on the number of CPU cores:

```
4 CPU cores → 4 worker processes
Each worker handles thousands of connections concurrently
```

---

## 4. NGINX Request Flow

```
Step 1  →  Start NGINX          sudo systemctl start nginx
Step 2  →  Client sends request  Browser / curl / API client
Step 3  →  TCP Connection        3-way handshake: SYN → SYN-ACK → ACK
Step 4  →  Socket Creation       OS assigns connection to a socket
Step 5  →  epoll Mechanism       Linux monitors multiple connections efficiently
Step 6  →  Request Handling      Readable → read request | Writable → send response
Step 7  →  Connection Lifecycle  Closed → removed | Keep-Alive → reused
```

> **epoll** is a Linux system call that lets NGINX monitor thousands of file descriptors simultaneously with near-zero overhead.

---

## 5. Installing NGINX on Ubuntu

```bash
sudo apt update
sudo apt install nginx -y
```

**Verify:**
```bash
sudo systemctl status nginx
nginx -v
```

**On RHEL / CentOS:**
```bash
sudo yum install epel-release -y
sudo yum install nginx -y
```

---

## 6. Project 1 — Serving a Static Website

**Repo:** https://github.com/jaiswaladi246/static-site.git

### Step 1 — Place Files in Web Root

NGINX serves from `/var/www/html` by default. Create your own site directory:

```bash
sudo mkdir -p /var/www/static-site
sudo cp -r * /var/www/static-site

# Set correct ownership
sudo chown -R www-data:www-data /var/www/static-site
```

### Step 2 — Create a Virtual Host File

```bash
sudo vi /etc/nginx/sites-available/static-site
```

```nginx
server {
    listen 80;
    server_name skjptpp.in;

    root  /var/www/static-site;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

**Directive Reference:**

| Directive | Role |
|---|---|
| `listen 80` | Binds to port 80 (HTTP) |
| `server_name` | Domains this block responds to |
| `root` | Document root directory |
| `index` | Default file served when `/` is requested |
| `try_files` | Resolves file path — returns 404 if not found |

### Step 3 — Enable Site and Reload

```bash
sudo ln -s /etc/nginx/sites-available/static-site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://skjptpp.in` (after DNS setup) — static site is live!

---

### Custom Error Pages (404 / 500)

Default NGINX error pages are plain and unfriendly. Here's how to replace them:

#### 1. Create error pages

```
/var/www/static-site/
├── 404.html
└── 500.html
```

#### 2. Update the server block

```nginx
server {
    ...

    error_page 404 /404.html;
    error_page 500 502 503 504 /500.html;

    location = /404.html {
        root /var/www/static-site;
        internal;
    }

    location = /500.html {
        root /var/www/static-site;
        internal;
    }
}
```

| Directive | Meaning |
|---|---|
| `error_page` | Maps HTTP status code to a custom page |
| `location =` | Exact URI match |
| `internal` | Only served by NGINX errors — not directly accessible by users |

---

## 7. Project 2 — NGINX as a Reverse Proxy

**Repo:** https://github.com/jaiswaladi246/nginx-node-proxy.git

```bash
git clone https://github.com/jaiswaladi246/nginx-node-proxy.git
```

### Step 1 — Copy Frontend Files

```bash
sudo mkdir -p /var/www/frontend
sudo cp -r frontend/* /var/www/frontend/
sudo chown -R www-data:www-data /var/www/frontend
```

### Step 2 — Create NGINX Config

```bash
sudo vi /etc/nginx/sites-available/nginx-node-proxy
```

```nginx
server {
    listen 80;
    server_name skjptpp.in;

    root  /var/www/frontend;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ =404;
    }

    # Reverse proxy to Node.js REST API
    location /api/ {
        proxy_pass         http://13.201.37.133:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host            $host;
        proxy_set_header   X-Real-IP       $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support (Socket.io)
    location /socket.io/ {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
    }
}
```

### Step 3 — Start the Node.js Backend

```bash
cd /home/ubuntu/nginx-node-proxy/backend
npm init -y
npm install express cors socket.io
node index.js
```

### Step 4 — Enable Site and Reload

```bash
sudo ln -s /etc/nginx/sites-available/nginx-node-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://skjptpp.in`

---

## 8. Project 3 — NGINX as a Load Balancer

**Repo:** https://github.com/jaiswaladi246/nginx-loadbalancer.git

```bash
git clone https://github.com/jaiswaladi246/nginx-loadbalancer.git
```

### Step 1 — Copy Frontend Files

```bash
sudo mkdir -p /var/www/frontend
sudo cp -r frontend/* /var/www/frontend/
sudo chown -R www-data:www-data /var/www/frontend
```

### Step 2 — Create NGINX Config

```bash
sudo vi /etc/nginx/sites-available/nginx-loadbalancer
```

```nginx
upstream backend_apis {
    least_conn;
    server 13.201.37.133:3001;
    server 13.201.37.133:3002;
}

server {
    listen 80;
    server_name skjptpp.in;

    root  /var/www/frontend;
    index index.html;

    # Serve frontend (HTML, CSS, JS)
    location / {
        try_files $uri $uri/ =404;
    }

    # Proxy API requests to backend Node.js apps
    location /api/ {
        proxy_pass         http://backend_apis;
        proxy_http_version 1.1;
        proxy_set_header   Host            $host;
        proxy_set_header   X-Real-IP       $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Step 3 — Start Both Backends

```bash
cd /home/ubuntu/nginx-loadbalancer/

# Backend 1 (open in a new terminal tab)
cd backend1 && npm init -y && npm install express
node index.js

# Backend 2 (open in another terminal tab)
cd backend2 && npm init -y && npm install express
node index.js
```

### Step 4 — Enable Site and Reload

```bash
sudo ln -s /etc/nginx/sites-available/nginx-loadbalancer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5 — Simulate Traffic

```bash
sudo apt install apache2-utils -y
ab -n 100 -c 10 http://skjptpp.in/api/
```

> `-n 100` = 100 total requests · `-c 10` = 10 concurrent requests

---

## 9. SSL/TLS Setup with Self-Signed Certificate

> Ideal for local development, internal tools, and non-public test environments.

### Why Use HTTPS Even in Dev?

- Encrypts traffic between client and server
- Simulates a production-like environment
- Helps catch mixed-content issues early
- Required by modern frontend frameworks and APIs

### Step 1 — Generate Certificate and Key

```bash
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt
```

> When prompted for **Common Name (CN):** enter `localhost` or your server's IP.

### Step 2 — Update NGINX Configuration

```bash
sudo nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    location / {
        proxy_pass       http://localhost:3000;
        proxy_set_header Host      $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name localhost;
    return 301 https://$host$request_uri;
}
```

### Step 3 — Reload NGINX

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4 — Test HTTPS

```bash
# In browser
https://localhost

# With curl (-k allows self-signed certs)
curl -k https://localhost
```

> ⚠️ Browser will show **"Your connection is not private"** — this is expected. Proceed anyway.

### SSL File Paths

| Path | Purpose |
|---|---|
| `/etc/ssl/certs/nginx-selfsigned.crt` | SSL certificate |
| `/etc/ssl/private/nginx-selfsigned.key` | Private key |
| `/etc/nginx/sites-available/default` | HTTPS proxy config |

---

## 10. Load Balancing Algorithms

| Algorithm | Behavior |
|---|---|
| **round-robin** | Default — rotates through all backends equally |
| **least_conn** | Sends to the backend with fewest active connections |
| **ip_hash** | Uses client IP to consistently route to the same backend (sticky sessions) |

### Round-Robin (Default)

```nginx
upstream backend_app {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### Least Connections

```nginx
upstream backend_app {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### IP Hash (Sticky Sessions)

```nginx
upstream backend_app {
    ip_hash;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### Weighted

```nginx
upstream backend_app {
    server 127.0.0.1:3001 weight=3;   # gets 3x more traffic
    server 127.0.0.1:3002 weight=1;
}
```

---

## 11. NGINX vs Apache

| Feature | NGINX | Apache |
|---|---|---|
| Architecture | Event-driven (asynchronous) | Process / thread-based |
| Performance | High concurrency, fast | Slower under many connections |
| Memory usage | Low | High |
| Static content | Extremely fast | Good |
| Config format | Simple, declarative | Flexible but complex |
| Use cases | Web server, reverse proxy, LB | Traditional web server |

> DevOps engineers prefer NGINX for its **lightweight footprint**, **ease of automation**, and **Docker/Kubernetes friendliness**.

---

## 12. Common DevOps Use Cases

| Use Case | Example |
|---|---|
| Web server | Serving static React / Angular / Vue apps |
| Reverse proxy | Forwarding requests to Node.js, Python, Java backends |
| Load balancer | Distributing load across multiple backend servers |
| SSL termination | Handling HTTPS at the edge |
| Caching | Reducing load on upstream services |
| Ingress controller | Managing traffic inside Kubernetes clusters |
| Rate limiting | Protecting APIs from abuse or bots |

---

## 13. NGINX File Structure

| Path | Purpose |
|---|---|
| `/etc/nginx/nginx.conf` | Main configuration file |
| `/etc/nginx/sites-available/` | All virtual host (server block) configs |
| `/etc/nginx/sites-enabled/` | Symlinks to active site configs |
| `/var/www/html` | Default web root directory |
| `/var/log/nginx/access.log` | Access log |
| `/var/log/nginx/error.log` | Error log |

---

## 14. Docker Demo

```bash
# Run NGINX container
docker run --name nginx-demo -p 8080:80 -d nginx

# Test — visit http://localhost:8080
# You should see the Welcome to NGINX page

# View logs
docker logs nginx-demo

# Clean up
docker stop nginx-demo
docker rm nginx-demo
```

> Using Docker is the recommended approach for DevOps workflows — no installation required, fully isolated, easy to version.

---

*NGINX — Event-driven. Asynchronous. Production-ready.*
