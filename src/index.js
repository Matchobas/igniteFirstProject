const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

const customers = [];

// Middleware de verificação de conta
function checkIfAccountExists(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find(
        customer => customer.cpf === cpf
    );

    if (!customer) {
        return response.status(400).json({message: 'Customer does not exist!'});
    }

    request.customer = customer;

    return next();
}

// Retorna o balanço da conta, considerando todas as entradas e saídas
function getBalance(statement) {
    const balance = statement.reduce((accumulator, operator) => {
        if (operator.type === 'credit') {
            return accumulator += operator.amount;
        } else {
            return accumulator -= operator.amount;
        }
    }, 0);

    return balance;
}

// Funcionalidade de criação de um novo usuário
app.post('/account', (request, response) => {
    const { cpf, name } = request.body;

    const existingCustomer = customers.some(
        customer => customer.cpf === cpf
    );

    if (existingCustomer) {
        return response.status(400).send({message: 'Given CPF already exists'});
    }

    customers.push({
        id: uuidv4(),
        cpf,
        name,
        statement: []
    });

    response.status(201).send();
});

// Funcionalidade de retornar o extrato do cliente
app.get('/statement', checkIfAccountExists, (request, response) => {
    const { statement } = request.customer;

    return response.json(statement);
});

app.post('/deposit', checkIfAccountExists, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: 'credit'
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.post('/withdraw', checkIfAccountExists, (request, response) => {
    const { amount, description } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);
    const result = balance - amount;

    if (result < 0) {
        return response.status(400).json({message: 'Your balance is insuficient'});
    }

    const operation = {
        description,
        amount,
        created_at: new Date(),
        type: 'withdraw'
    }

    customer.statement.push(operation);

    return response.status(201).send({balance: result});
});

app.get('/statement/date', checkIfAccountExists, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    console.log(dateFormat);
    console.log(new Date(date));
    console.log(customer.statement[0].created_at);

    const dateStatements = customer.statement.filter((states) => {
        if (states.created_at.toDateString() === dateFormat.toDateString()) {
            return states;
        }
    });

    return response.json(dateStatements);
});

app.put('/account', checkIfAccountExists, (request, response) => {
    const { customer } = request;
    const { name } = request.body;

    customer.name = name;

    return response.status(200).json(customer);
});

app.get('/account', checkIfAccountExists, (request, response) => {
    const { customer } = request;
    
    return response.status(200).json(customer);
});

app.get('/accounts', checkIfAccountExists, (request, response) => {
    return response.status(200).json(customers);
});

app.delete('/account', checkIfAccountExists, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
});

app.get('/account/balance', checkIfAccountExists, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.status(200).json({balance});
});

app.listen(3333, () => {
    console.log('Servidor iniciado!! Voa mlks');
});