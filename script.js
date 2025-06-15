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
      exercicios = data; // exercicios agora contém as categorias como chaves
      const lista = document.getElementById('lista-exercicios');
      lista.innerHTML = ''; // Limpa o menu existente

      // Itera sobre as categorias
      for (const categoriaKey in exercicios) {
        if (exercicios.hasOwnProperty(categoriaKey)) {
          const categoria = exercicios[categoriaKey];
          
          // Cria o elemento para o título da categoria
          const categoriaTituloLi = document.createElement('li');
          const categoriaTituloDiv = document.createElement('div');
          categoriaTituloDiv.className = 'category-title';
          // Capitaliza a primeira letra da chave da categoria para exibição
          categoriaTituloDiv.textContent = categoriaKey.charAt(0).toUpperCase() + categoriaKey.slice(1);
          categoriaTituloLi.appendChild(categoriaTituloDiv);
          lista.appendChild(categoriaTituloLi);

          // Cria a lista (ul) para os exercícios dentro desta categoria
          const exerciciosDaCategoriaUl = document.createElement('ul');
          exerciciosDaCategoriaUl.className = 'exercise-list';
          // Adiciona a classe 'active' para a primeira categoria, se desejar que ela comece expandida
          // if (Object.keys(exercicios)[0] === categoriaKey) {
          //   exerciciosDaCategoriaUl.classList.add('active');
          // }
          categoriaTituloLi.appendChild(exerciciosDaCategoriaUl);

          // Adiciona um evento de clique para expandir/recolher a lista de exercícios
          categoriaTituloDiv.addEventListener('click', () => {
            exerciciosDaCategoriaUl.classList.toggle('active');
          });

          // Itera sobre os exercícios dentro da categoria atual
          for (const exercicioKey in categoria) {
            if (categoria.hasOwnProperty(exercicioKey)) {
              const exercicio = categoria[exercicioKey];
              const itemExercicio = document.createElement('li');
              const linkExercicio = document.createElement('a');
              linkExercicio.href = "#";
              // Usar o título completo para o link, removendo "Exercício: " se quiser
              linkExercicio.textContent = exercicio.titulo.replace('Exercício: ', '');
              // Armazena as chaves da categoria e do exercício para carregar corretamente
              linkExercicio.dataset.categoriaKey = categoriaKey;
              linkExercicio.dataset.exercicioKey = exercicioKey;
              
              linkExercicio.onclick = (event) => {
                event.preventDefault(); // Impede o comportamento padrão do link
                carregarExercicio(event.target.dataset.categoriaKey, event.target.dataset.exercicioKey);
                // Opcional: remover classe 'active-link' de todos e adicionar ao clicado
                document.querySelectorAll('#lista-exercicios a').forEach(a => a.classList.remove('active-link'));
                event.target.classList.add('active-link');
              };
              itemExercicio.appendChild(linkExercicio);
              exerciciosDaCategoriaUl.appendChild(itemExercicio);
            }
          }
        }
      }
    })
    .catch(error => console.error('Erro ao carregar exercícios:', error));
}


// A função carregarExercicio agora precisa da chave da categoria e da chave do exercício
function carregarExercicio(categoriaKey, exercicioKey) {
  const exercicio = exercicios[categoriaKey][exercicioKey];
  exercicioAtual = exercicio; // exercicioAtual ainda será o objeto completo do exercício

  document.getElementById('titulo').textContent = exercicio.titulo;
  document.getElementById('descricao').innerHTML = exercicio.descricao;
  document.getElementById('codigo').value = exercicio.codigo;
  document.getElementById('test-result').innerHTML = ""; // Limpa resultados anteriores
}

function verificarResposta() {
  if (!exercicioAtual) return;
  const codigoBase = document.getElementById("codigo").value;
  const testResultDiv = document.getElementById("test-result");
  testResultDiv.innerHTML = "<table><tr><th>Teste</th><th>Esperado</th><th>Obtido</th><th>Resultado</th></tr></table>"; // Corrigido o cabeçalho
  const table = testResultDiv.querySelector("table");

  const promises = exercicioAtual.testes.map(teste => {
    // Para Skulpt, é importante que o código da função e a chamada do teste estejam juntos.
    // Se o usuário apagar a função, o teste falhará.
    const codigoParaExecutar = codigoBase + "\n" + teste.entrada; // Concatena a função do usuário e a chamada de teste
    let saidaTeste = "";

    // Redefine a função de output para cada teste para capturar a saída isoladamente
    Sk.configure({
      output: (text) => saidaTeste += text,
      read: builtinRead, // Garante que builtinRead ainda está configurado
      __future__: Sk.python3
    });

    return Sk.misceval.asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, codigoParaExecutar, true))
      .then(() => {
        // Skulpt adiciona uma quebra de linha no final, então trim() é importante.
        const obtido = saidaTeste.trim();
        const esperado = String(teste.esperado).trim(); // Garante que esperado é string e sem espaços

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
    // Pega as linhas da tabela (ignorando o cabeçalho) e filtra as que passaram
    const acertos = Array.from(table.rows).slice(1).filter(row => row.cells[3].className === "ok").length;
    // Atualiza a div de resultados com o progresso
    document.getElementById("test-result").innerHTML += `<p>Progresso: ${acertos} de ${total} testes OK</p>`;
  });
}


// Carrega os exercícios quando a janela é carregada
window.onload = carregarExercicios;
