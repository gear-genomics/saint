import axios from "axios";

const genomes = require("../../../../fm/genomeindexindex.json");

const queryInput = document.getElementById("query");
const genomeSelect = document.getElementById("genome");
const distanceInput = document.getElementById("distance");
const hammingCheck = document.getElementById("hamming");

const buttonRun = document.getElementById("btn-submit");
const buttonExample = document.getElementById("btn-example");
const linkResults = document.getElementById("link-results");
const runNotification = document.getElementById("result-info");
const errorNotification = document.getElementById("result-error");
const errorMessage = document.getElementById("error-message");
const containerResults = document.getElementById("result-container");

buttonRun.addEventListener("click", run);
buttonExample.addEventListener("click", showExample);

genomeSelect.innerHTML = genomes
  .map(
    g =>
      `<option value="${g.file}"${g.preselect ? "selected" : ""}>${
        g.name
      }</option>`
  )
  .join("");

function run() {
  hideElement(containerResults);
  hideElement(errorNotification);
  showElement(runNotification);
  linkResults.click();

  const query = queryInput.value;
  const genome = genomeSelect.value;
  const distance = Number.parseInt(distanceInput.value);
  const hamming = hammingCheck.checked;
  const payload = { query, genome, distance, hamming };

  makeRequest(payload);
}

function makeRequest(payload) {
  axios.post("http://localhost:3000/run", payload).then(res => {
    if (res.data.error) {
      showError(res.data.error);
    } else {
      const id = res.data.id;
      poll(id);
    }
  });
}

function processResult(data) {
  if (data.data.length === 0) {
    containerResults.innerHTML = "No hits found.";
    return;
  }
  const table = `<table class="table">
    <thead>
      <tr>
        <th scope="col">Chromosome</th>
        <th scope="col">Start</th>
        <th scope="col">End</th>
        <th scope="col">Strand</th>
        <th scope="col">Score</th>
        <th scope="col">Alignment (query on top)</th>
      </tr>
    </thead>
    <tbody>
      ${data.data
        .map(
          align =>
            `<tr>
              <td>${align.chr}</td>
              <td>${align.start}</td>
              <td>${align.end}</td>
              <td>${align.strand}</td>
              <td>${align.score}</td>
              <td>${alignment(align.queryalign, align.refalign)}</td>
            <tr>`
        )
        .join("")}
    </tbody>
  </table>`;
  containerResults.innerHTML = table;
  showElement(containerResults);
}

function alignment(s1, s2) {
  const ret = [];
  ret.push(`<pre style="margin: 0;">${s1}</pre>`);
  ret.push(
    `<pre style="margin: 0;">` +
      s1
        .split("")
        .map((c, i) => (c === s2[i] ? " " : "|"))
        .join("") +
      "</pre>"
  );
  ret.push(`<pre style="margin: 0;">${s2}</pre>`);
  return ret.join("");
}

function poll(id, options = {}) {
  const { interval = 2000, timeout = 300000 } = options;
  const start = new Date();
  const loop = setInterval(() => {
    axios.get(`http://localhost:3000/results/${id}`).then(res => {
      const status = res.data.status;
      if (status === "success") {
        clearInterval(loop);
        hideElement(runNotification);
        processResult(res.data.data);
      }
      if (status === "error") {
        clearInterval(loop);
        showError("Server error.");
      }
      const now = new Date();
      if (now - start > timeout) {
        clearInterval(loop);
        showError("Your request timed out.");
      }
    });
  }, interval);
}

function showExample() {
  queryInput.value = "AGTAATGGATAGGATAAGTCCCCAG";
  genomeSelect.value = "Homo_sapiens.GRCh37.dna.primary_assembly.fa.gz";
  distanceInput.value = 2;
  hammingCheck.checked = false;
  setTimeout(() => {
    linkResults.click();
    run();
  }, 1000);
}

function isDna(seq) {
  const dnaPat = /^[acgt]+$/i;
  return dnaPat.test(seq);
}

function showError(message) {
  errorMessage.innerText = message;
}

function showElement(element) {
  element.classList.remove("d-none");
}

function hideElement(element) {
  element.classList.add("d-none");
}
