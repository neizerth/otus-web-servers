
const express = require('express')
const app = express()
const port = 3000

let users = [
  {
    id: 1,
    name: 'Vladimir'
  },
  {
    id: 2,
    name: 'Beth'
  }
]

app.use(express.json());

app.get('/user', (req, res) => {
  res.send(users)
})

app.post('/user', (req, res) => {
  const { body } = req;
  users.push(body);

  res.send(users)
})

app.put('/user/:id', (req, res) => {
  const { body } = req;
  const id = +req.params.id;

  users = users.map(user => {
    if (user.id === id) {
      return {
        ...user,
        ...body
      }
    }
    return user;
  })

  res.send(users)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})