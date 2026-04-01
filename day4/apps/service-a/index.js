const express = require("express");
const client = require("prom-client");

const app = express();
const port = 3000;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Counter
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

// Histogram
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
});

// ✅ NEW: Summary metric
const httpRequestSummary = new client.Summary({
  name: "http_request_duration_summary_seconds",
  help: "Summary of HTTP request durations in seconds",
  labelNames: ["method", "route", "status"],
  percentiles: [0.5, 0.9, 0.99], // p50, p90, p99
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestSummary);

// Middleware
app.use((req, res, next) => {
  const histogramEnd = httpRequestDuration.startTimer();
  const summaryEnd = httpRequestSummary.startTimer();

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: req.path,
      status: res.statusCode,
    };

    httpRequestCounter.inc(labels);
    histogramEnd(labels);
    summaryEnd(labels);
  });

  next();
});

// Routes
app.get("/", (req, res) => {
  res.send("Hello from Prometheus demo app 🚀");
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});