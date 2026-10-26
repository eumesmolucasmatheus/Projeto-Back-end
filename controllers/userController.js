// CRUD de usuários
const { Op } = require('sequelize');
const { User } = require('../models');
const hashService = require('../services/hashService');
const { isNonEmptyString, isEmail } = require('../utils/validators');

// Retorna a lista de problemas de validação dos dados pessoais do usuário
const validateProfile = ({ firstname, surname, email } = {}) => {
  const errors = [];
  if (!isNonEmptyString(firstname)) errors.push('firstname é obrigatório');
  if (!isNonEmptyString(surname)) errors.push('surname é obrigatório');
  if (!isEmail(email)) errors.push('email inválido');
  return errors;
};

module.exports = {
  // GET /v1/user/:id
  async getUserById(req, res) {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'firstname', 'surname', 'email'], // nunca expõe a senha
    });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.status(200).json(user);
  },

  // POST /v1/user
  async createUser(req, res) {
    const body = req.body ?? {};
    const errors = validateProfile(body);
    if (!isNonEmptyString(body.password) || body.password.length < 6)
      errors.push('password deve ter pelo menos 6 caracteres');
    if (body.password !== body.confirmPassword) errors.push('As senhas não conferem');
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const email = body.email.trim();
    if (await User.findOne({ where: { email } }))
      return res.status(400).json({ message: 'E-mail já cadastrado' });

    const user = await User.create({
      firstname: body.firstname.trim(),
      surname: body.surname.trim(),
      email,
      password: await hashService.hash(body.password),
    });
    return res.status(201).json({ id: user.id, message: 'Usuário criado com sucesso' });
  },

  // PUT /v1/user/:id (autenticado; só o próprio usuário pode alterar a si mesmo)
  async updateUser(req, res) {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (user.id !== req.userId)
      return res.status(403).json({ message: 'Você só pode alterar o seu próprio usuário' });

    const body = req.body ?? {};
    const errors = validateProfile(body);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    // O novo e-mail não pode pertencer a outro usuário
    const email = body.email.trim();
    const taken = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
    if (taken) return res.status(400).json({ message: 'E-mail já cadastrado' });

    await user.update({ firstname: body.firstname.trim(), surname: body.surname.trim(), email });
    return res.status(204).send();
  },

  // DELETE /v1/user/:id (autenticado; só o próprio usuário pode se excluir)
  async deleteUser(req, res) {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (user.id !== req.userId)
      return res.status(403).json({ message: 'Você só pode excluir o seu próprio usuário' });

    await user.destroy();
    return res.status(204).send();
  },
};
