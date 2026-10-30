// Local QA only. This script never loads credentials or calls the NSW service.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("public");
const portIndex = process.argv.indexOf("--port");
const port = Number(
  portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000,
);
const checkedAt = new Date().toISOString();
const records = [
  {
    licenceID: "qa-1",
    licenceName: "Alex Example",
    licenceNumber: "DEMO12345",
    licenceType: "Real estate agent",
    status: "Current",
    suburb: "Riverstone",
    postcode: "2765",
  },
  {
    licenceID: "qa-2",
    licenceName: "Alex Example",
    licenceNumber: "DEMO67890",
    licenceType: "Real estate agent",
    status: "Expired",
    suburb: "Richmond",
    postcode: "2753",
  },
  {
    licenceID: "qa-3",
    licenceName: "<img src=x onerror=alert(1)> Example",
    licenceNumber: "DEMO00000",
    licenceType: "Real estate agent",
    status: "",
    suburb: "",
    postcode: "",
  },
];
const corporation = { licenceID: "qa-corporation", licenceName: "Example Property Pty Ltd", licenceNumber: "DEMO99999", licenceType: "Property - Corporation", status: "Current", suburb: "Riverstone", postcode: "2765" };
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".json": "application/json",
};
function json(res, body, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}
createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  // QA surfaces are generated here and never included in the deployed public tree.
  if (url.pathname === "/__qa/mobile") {
    const width = Math.max(
      320,
      Math.min(1024, Number(url.searchParams.get("width")) || 390),
    );
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(
      `<!doctype html><title>AgentCheck responsive QA</title><body style="margin:0;background:#d9e1ed"><iframe title="AgentCheck mobile QA" src="/" style="display:block;border:0;width:${width}px;height:860px;margin:20px auto"></iframe></body>`,
    );
  }
  if (url.pathname === "/api/search") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    if (q === "error")
      return json(res, { error: "Simulated NSW service unavailable." }, 502);
    if (q === "quota")
      return json(res, { error: "Simulated lookup limit. Try later." }, 429);
    const found =
      q === "corporation" ? [corporation] : q === "none" ? [] : q === "single" ? records.slice(0, 1) : records;
    return json(res, { results: found, truncated: q === "many", checkedAt });
  }
  if (url.pathname === "/api/details") {
    const record = [...records, corporation].find(
      (r) => r.licenceID === url.searchParams.get("id"),
    );
    if (!record)
      return json(res, { error: "Simulated record not found." }, 404);
    // A small delay makes the actual loading animation reviewable.
    return setTimeout(
      () =>
        json(res, {
          detail: {
            ...record,
            startDate: "2020-01-01",
            expiryDate: "2027-01-01",
            classes: ["Real estate sales"],
            premises: ["Example business premises, NSW"],
            conditions: ["Simulated condition — for QA only"],
            compliance: { actions: [] },
          },
          checkedAt,
        }),
      650,
    );
  }
  try {
    const path = resolve(
      root,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (!path.startsWith(root + "/")) {
      res.writeHead(403);
      return res.end();
    }
    const filePath = (await stat(path)).isDirectory() ? resolve(path, "index.html") : path;
    let data = await readFile(filePath);
    if (filePath.endsWith(".html"))
      data = Buffer.from(
        data
          .toString()
          .replace(
            "<body>",
            '<body><div class="qa-banner">SIMULATED NSW RESPONSES · LOCAL QA ONLY</div>',
          ),
      );
    res.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, "0.0.0.0", () =>
  console.log(`AgentCheck local simulated QA at http://localhost:${port}`),
);
