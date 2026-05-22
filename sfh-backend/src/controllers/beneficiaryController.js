const beneficiaryService = require('../services/beneficiaryService');

const create = async (req, res) => {
  try {
    const beneficiary = await beneficiaryService.createBeneficiary(req.body, req.user.userId, req.user);
    return res.status(201).json(beneficiary);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const list = async (req, res) => {
  try {
    const beneficiaries = await beneficiaryService.listBeneficiaries();
    return res.status(200).json(beneficiaries);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load beneficiaries.' });
  }
};

const getOne = async (req, res) => {
  try {
    const beneficiary = await beneficiaryService.getBeneficiaryById(req.params.id);
    if (!beneficiary) return res.status(404).json({ message: 'Beneficiary not found.' });
    return res.status(200).json(beneficiary);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load beneficiary.' });
  }
};

const update = async (req, res) => {
  try {
    const beneficiary = await beneficiaryService.updateBeneficiary(req.params.id, req.body);
    return res.status(200).json(beneficiary);
  } catch (error) {
    if (error.message === 'Beneficiary not found.') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await beneficiaryService.deleteBeneficiary(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Beneficiary not found.') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { create, list, getOne, update, remove };
