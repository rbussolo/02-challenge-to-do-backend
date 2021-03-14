const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  // Carrega o username que vem pelo header
  const { username } = request.headers;

  // Verifica se existe este usuário
  const user = users.find((user) => user.username === username);

  // Caso não tenha sido localizado, retorna um erro
  if(!user){
    return response.status(404).json({ error: "User not found!" });
  }

  // Adiciona este usuário na requisição
  request.user = user;

  // Passa para a proxima etapa
  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  // Carrega usuário que esta nesta requisição
  const { user } = request;

  // Verifica se este usuário é plano GRATIS e já tem 10 tarefas
  if(!user.pro && user.todos.length == 10){
    return response.status(403).json({ error: "User already has 10 todos, necessary update account to PRO to create a new todo." });
  }

  // Avança para proxima etapa
  return next();
}

function checksTodoExists(request, response, next) {
  // Carrega o username que vem pelo header
  const { username } = request.headers;

  // Carrega o ID do todo que esta sendo consultado
  const { id } = request.params;
  
  // Valida se o ID fornecido é no formado uuid
  const validId = validate(id);

  if(!validId){
    return response.status(400).json({ error: "Not valid todo ID!" });
  }

  // Verifica se existe este usuário
  const user = users.find((user) => user.username === username);

  // Caso não tenha sido localizado, retorna um erro
  if(!user){
    return response.status(404).json({ error: "User not found!" });
  }

  // Verifica se localiza este todo na lista de tarefas deste usuário
  const todo = user.todos.find((todo) => todo.id === id);

  // Caso não tenha sido localizado a tarefa retorna um erro
  if(!todo){
    return response.status(404).json({ error: "Todo not found!" });
  }

  // Adiciona na requisição o usuário e a tarefa
  request.user = user;
  request.todo = todo;

  // Avança para proxima etapa
  next();
}

function findUserById(request, response, next) {
  // Carrega o username que vem pelo header
  const { id } = request.params;

  // Verifica se existe este usuário
  const user = users.find((user) => user.id === id);

  // Caso não tenha sido localizado, retorna um erro
  if(!user){
    return response.status(404).json({ error: "User not found!" });
  }

  // Adiciona este usuário na requisição
  request.user = user;

  // Passa para a proxima etapa
  return next();
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};