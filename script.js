let exercicios = {};
let exercicioAtual = null;

Sk.configure({
  output: function (text) {},
  read: builtinRead,
  __future__: Sk.python3
});

function builtinRead(x) {
  if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
    throw "File not found: '" + x + "'";
  }
  return Sk.builtinFiles["files"][x];
}

function carregarExercicios() {
  fetch('exercicios.json')
    .then(response => response.json())
    .then(data => {
      exercicios = data;
      const lista = document.getElementById('lista-exercicios');
      lista.innerHTML = '';
      Object.keys(exercicios).forEach(chave => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = "#";
        link.textContent = chave;
        link.onclick = () => carregarExercicio(chave);
        item.appendChild(link);
        lista.appendChild(item);
      });
    });
}

function carregarExercicio(nome) {
  const exercicio = exercicios[nome];
  exercicioAtual = exercicio;
  document.getElementById('titulo').textContent = exercicio.titulo;
  document.getElementById('descricao').innerHTML = exercicio.descricao;
  document.getElementById('codigo').value = exercicio.codigo;
  document.getElementById('test-result').innerHTML = "";
}

function verificarResposta() {
  if (!exercicioAtual) return;
  const codigoBase = document.getElementById("codigo").value;
  const testResultDiv = document.getElementById("test-result");
  testResultDiv.innerHTML = "<table><tr><th>Test</th><th>Expected</th><th>Run</th><th>Result</th></tr>";
  const table = testResultDiv.querySelector("table");

  const promises = exercicioAtual.testes.map(teste => {
    const codigoTeste = codigoBase.replace(/print\(.*\)/, "") + "\nprint(" + teste.entrada + ")";
    let saidaTeste = "";
    Sk.configure({
      output: (text) => saidaTeste += text
    });
    return Sk.misceval.asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, codigoTeste, true))
      .then(() => {
        const obtido = saidaTeste.trim();
        const esperado = teste.esperado;
        const row = table.insertRow();
        row.insertCell(0).textContent = teste.entrada;
        row.insertCell(1).textContent = esperado;
        row.insertCell(2).textContent = obtido;
        const resultCell = row.insertCell(3);
        const passou = obtido === esperado;
        resultCell.textContent = passou ? "OK" : "X";
        resultCell.className = passou ? "ok" : "fail";
      })
      .catch((err) => {
        const row = table.insertRow();
        row.insertCell(0).textContent = teste.entrada;
        row.insertCell(1).textContent = teste.esperado;
        row.insertCell(2).textContent = "Erro: " + err.toString();
        const resultCell = row.insertCell(3);
        resultCell.textContent = "X";
        resultCell.className = "fail";
      });
  });

  Promise.all(promises).then(() => {
    const total = exercicioAtual.testes.length;
    const acertos = Array.from(table.rows).slice(1).filter(row => row.cells[3].className === "ok").length;
    testResultDiv.innerHTML += `<p>Progresso: ${acertos} de ${total} testes OK</p>`;
  });
}

window.onload = carregarExercicios;

