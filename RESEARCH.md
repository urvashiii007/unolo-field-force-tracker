# Real-Time Location Tracking Architecture for Unolo Field Force Tracker

## Overview

Unolo’s Field Force Tracker currently relies on manual employee check-ins.
As the platform scales, this approach limits real-time visibility and makes it
hard for managers to monitor live field movement.

The objective of this research is to design a **real-time location tracking
architecture** that can:

- Support **10,000+ concurrent field employees**
- Handle **location updates every 30 seconds**
- Work reliably on **unstable mobile networks**
- Minimize **mobile battery drain**
- Remain **cost-effective for a startup**
- Be maintainable by a **small engineering team**

This document evaluates multiple real-time communication technologies,
recommends the most practical architecture for Unolo, and clearly explains
the trade-offs involved.

---

## 1. Technology Comparison

Based on real-world constraints and system requirements, the following three
approaches were analyzed:

- WebSockets  
- Server-Sent Events (SSE)  
- Managed Real-Time Services (Firebase / Pusher / Ably)

The comparison focuses on **latency, scalability, battery usage, reliability,
cost, and operational complexity**.

---

### 1️⃣ WebSockets

#### How It Works
WebSockets establish a **persistent, full-duplex TCP connection** between the
client and server. After an initial HTTP handshake, both sides can send data
at any time without repeated request–response overhead.

#### Pros
- Extremely low latency
- True bi-directional communication
- Minimal per-message overhead
- Well-suited for high-frequency real-time systems

#### Cons
- Each client holds an open connection (memory intensive)
- Requires manual reconnection logic
- Stateful scaling (sticky sessions, Redis, message brokers)
- Persistent connections can increase mobile battery drain

#### When to Use
- Chat applications
- Multiplayer games
- Collaborative real-time tools
- Sub-second update requirements

---

### 2️⃣ Server-Sent Events (SSE)

#### How It Works
Server-Sent Events use a **persistent HTTP connection** where the server streams
updates to the client. Communication is **one-way (server → client)** and handled
via the browser’s `EventSource` API.

#### Pros
- Built on standard HTTP
- Automatic reconnection support
- Lower server complexity than WebSockets
- Works efficiently with HTTP/2 multiplexing
- More battery-friendly for dashboards

#### Cons
- One-way communication only
- Not suitable for frequent client-to-server updates
- Text-based messaging only

#### When to Use
- Live dashboards
- Monitoring systems
- Notifications and streaming updates

---

### 3️⃣ Managed Real-Time Services (Firebase / Pusher / Ably)

#### How It Works
Managed services provide hosted real-time infrastructure that abstracts
WebSockets/SSE and handles scaling, reconnections, and delivery guarantees.

#### Pros
- Very fast to implement
- Built-in reliability and global scaling
- Minimal backend effort

#### Cons
- High recurring cost at scale
- Usage-based pricing penalizes frequent updates
- Vendor lock-in
- Less control over data flow

#### When to Use
- MVPs
- Small user bases
- Teams with limited backend capacity

---

### Comparison Summary

| Criteria | WebSockets | SSE | Managed Services |
|--------|-----------|-----|------------------|
| Bi-directional | Yes | No | Yes |
| Latency | Very Low | Low | Very Low |
| Battery Efficiency | Medium | High | Medium |
| Cost at Scale | Low | Low | High |
| Complexity | High | Medium | Very Low |
| Startup Fit | Medium | High | Medium |

---

## 2. Recommended Architecture

### **Hybrid REST + SSE over HTTP/2**

Instead of relying on a single protocol, the most practical solution for Unolo
is a **hybrid architecture**:

- **REST (HTTP/2)** for employee → server location ingestion  
- **Server-Sent Events (SSE)** for server → manager dashboard updates  

This recommendation balances performance, cost, reliability, and battery usage.

---

### Why This Architecture Fits Unolo

#### 🔹 Scale: 10,000+ Employees

With location updates every 30 seconds:

- ≈ **333 requests per second**
- ≈ **864 million updates per month**

Using REST for ingestion avoids maintaining 10,000 open socket connections.
SSE efficiently fans out updates to dashboards without duplicating ingestion load.


# Mathematical Analysis of Theoretical System Load

To validate the system’s scalability, we analyze the expected **network** and **computational** load under peak conditions.


## 1. Incoming Location Update Load

For **10,000 field agents**, each sending a location update every **30 seconds**:

\[
R_{ps} = \frac{10{,}000\ \text{agents}}{30\ \text{seconds}}
\;\approx\; 333\ \text{requests per second}
\]


## 2. Bandwidth Consumption

Assuming a **standard JSON payload of 512 bytes** per request (including headers):

\[
\text{Total Bandwidth}
= 333\ \text{req/s} \times 512\ \text{bytes}
\;\approx\; 170\ \text{KB/s}
\]


### Observation
- This bandwidth requirement is **trivial** for even a single entry-level cloud instance.
- Ingesting location updates is **not** the primary scaling bottleneck.


## 3. Fan-Out Load (Real Challenge)

The real scaling challenge arises from **fan-out to live dashboards**.

Assume:
- **100 managers**
- Each manager views the **entire fleet (10,000 agents)** in real time

Each incoming update must be broadcast to all viewers:

\[
\text{Pushes/s}
= 333\ \text{updates/s} \times 100\ \text{viewers}
= 33{,}300\ \text{events/s}
\]


## 4. Implications on Technology Choice

- A **Node.js server using Server-Sent Events (SSE) over HTTP/2** can sustain this throughput efficiently:
  - Single persistent connection per client
  - Low framing overhead
  - Native backpressure handling
- A **WebSocket-based approach** introduces:
  - Higher per-connection memory cost
  - Frame management overhead
  - Increased complexity in scaling and load balancing


## 5. Conclusion

- **Ingress traffic** (agent → server) is lightweight and easily scalable.
- **Egress fan-out traffic** (server → dashboards) dominates system load.
- **SSE over HTTP/2** is well-suited for this asymmetric, high fan-out, real-time update pattern.

---

#### 🔹 Battery Efficiency

Persistent WebSockets often keep mobile radios in high-power states.
Periodic HTTP requests allow devices to:

- Transmit briefly
- Return to low-power idle states
- Avoid constant heartbeats

This significantly improves battery life over a full workday.

---

#### 🔹 Reliability on Flaky Networks

- REST retries are simple and predictable
- SSE provides built-in reconnection
- No complex socket state to recover

This works well for employees moving between cellular networks or dead zones.

---

#### 🔹 Cost Efficiency for a Startup

Managed services like Ably or PubNub can exceed **$500/month** for 10,000 users.
A self-hosted Node.js + Redis setup can handle the same load for **under $100/month**.

This saves **$4,800+ annually**, which is significant for a startup.

---

#### 🔹 Reduced Development Time

The REST + SSE pattern uses familiar HTTP concepts.
Unlike WebSockets, it avoids:

- Sticky sessions
- Complex connection state
- Custom framing logic

This allows the team to focus on core features instead of infrastructure complexity.

---

## 3. Trade-offs and Risk Mitigation

### What We Sacrifice

- No native full-duplex communication to mobile devices
- Server commands require push notifications or polling

For Unolo’s primary use case (30s location tracking), this is acceptable.


### When We Would Reconsider

- Update frequency becomes sub-second
- Real-time two-way interaction is required
- Scale exceeds ~100,000 concurrent users


### Scale Breakdown Points

The architecture may face limits at **50k–100k concurrent connections** due to:

- TCP port exhaustion
- Redis pub/sub memory limits

At that stage, Kafka or multi-region routing would be required.

---

## 4. High-Level Implementation Plan

### Backend

- HTTP/2 REST endpoint for location ingestion
- Redis Pub/Sub for broadcasting updates
- SSE endpoint for dashboards
- Stateless, horizontally scalable servers


### Mobile & Frontend

- Periodic GPS capture (30s)
- REST uploads with retry + offline queue
- SSE subscription for live dashboards
- Android Foreground Services & iOS background location support


### Infrastructure

- HTTP/2-enabled backend
- Redis for message distribution
- Load balancer (future scaling)
- Monitoring for connection health


## Mathematical Load Analysis

For 10,000 users updating every 30 seconds:

- Requests/sec ≈ **333**
- Payload ≈ **512 bytes**
- Bandwidth ≈ **170 KB/s**

If 100 managers view dashboards:

- SSE pushes/sec ≈ **33,300**
- Well within Node.js + HTTP/2 capabilities


## Battery & OS Compliance Considerations

- Periodic uploads allow radios to return to idle states
- Persistent sockets prevent power-down
- Android requires Foreground Services
- iOS requires background location modes
- Offline caching ensures no data loss

---

## Final Conclusion

There is no perfect real-time architecture.

For Unolo’s current scale and constraints, the **REST + SSE hybrid approach**
offers the best balance of:

- Performance
- Battery efficiency
- Reliability
- Cost control
- Development simplicity

This architecture is **practical today** and **evolvable tomorrow**, making it
the most realistic and research-backed choice for Unolo’s Field Force Tracker.


