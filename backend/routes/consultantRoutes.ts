import express, { Router } from 'express';
import {
  registerConsultant,
  loginConsultant,
  listConsultants,
  getConsultant,
  updateConsultant
} from '../controllers/consultantController';

const router: Router = express.Router();

router.post('/signup', registerConsultant);
router.post('/login', loginConsultant);
router.get('/', listConsultants);
router.get('/:id', getConsultant);
router.patch('/:id', updateConsultant);

export default router;
