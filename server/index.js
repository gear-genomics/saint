const { spawn } = require("child_process");
const path = require("path");
const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");
const json = require("koa-json");
const uuidv4 = require("uuid/v4");

const app = new Koa();
const router = new Router();
const port = process.env.PORT || 3000;
const results = new Map();

const genomeDirectory = path.join(__dirname, "..", "fm");

function buildCommand(args) {
  const { distance, genome, hamming, query } = args;
  const genomePath = path.join(genomeDirectory, genome);
  return [
    "dicey",
    `hunt -d ${distance} -g ${genomePath} ${
      hamming ? "-n" : ""
    } ${query}`.split(/\s+/)
  ];
}

router.post("/run", ctx => {
  const id = uuidv4();
  const [command, args] = buildCommand(ctx.request.body);
  console.log("running", command, args.join(" "));
  const dicey = spawn(command, args);
  let result = "";
  dicey.stdout.setEncoding("utf8");
  dicey.stdout.on("data", data => {
    result += data;
  });
  dicey.on("close", () => {
    results.set(id, JSON.parse(result));
  });
  dicey.on("error", error => {
    ctx.body = { error: "Error running `dicey`" };
  });
  ctx.body = { id };
});

router.get("/results/:id", ctx => {
  const { id } = ctx.params;
  if (results.has(id)) {
    ctx.body = {
      status: "success",
      data: results.get(id)
    };
    results.delete(id);
  } else {
    ctx.body = { status: "pending" };
  }
});

app
  .use(cors())
  .use(bodyParser())
  .use(json())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(port);
