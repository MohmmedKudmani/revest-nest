# Project Overview

## What This Is

A NestJS microservices assignment for Revest — a retail platform company based in Saudi Arabia. The system consists of two backend services that communicate internally via TCP.

## Services

### Product Service (port 3001)

- Runs as a hybrid NestJS app: HTTP for external requests + TCP listener for inter-service calls
- Owns all product data in its own SQLite database
- Exposes CRUD via REST API
- Exposes `get_product` and `get_all_products` message patterns over TCP

### Order Service (port 3002)

- Runs as a standard HTTP NestJS app
- Owns all order data in its own SQLite database
- Exposes CRUD via REST API
- Calls Product Service via TCP (never via HTTP) to validate products and fetch details when creating/fetching orders

## Tech Stack

| Layer                   | Technology                              |
| ----------------------- | --------------------------------------- |
| Framework               | NestJS                                  |
| Language                | TypeScript                              |
| Inter-service transport | TCP via `@nestjs/microservices`         |
| External API            | REST (HTTP)                             |
| ORM                     | Prisma                                  |
| Database                | SQLite (one file per service)           |
| Validation              | `class-validator` + `class-transformer` |
| API docs                | Swagger via `@nestjs/swagger`           |
| Containerization        | Docker + Docker Compose (bonus)         |

## Evaluation Focus

The evaluators at Revest will look at:

1. Service separation — each service is independent, owns its own DB
2. Inter-service communication — orders call products via TCP, not HTTP
3. API design and Swagger documentation
4. Data modeling and relationships
5. Clean, maintainable code

## Constraints

- SQLite only — no PostgreSQL, no Redis, no external DB server
- In-memory is not used — Prisma + SQLite file per service
- No shared database between services — ever
- No HTTP calls from order-service to product-service — TCP only
- Docker Compose is a bonus — do it last
