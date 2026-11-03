const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
router.use(authenticate);
router.get('/me', allowRoles('Voter'), async (req, res, next) => {
  try { const [rows] = await db.execute('SELECT v.id, u.full_name, u.email, v.phone, v.address, v.dob, v.booth_id FROM voters v JOIN users u ON u.id=v.user_id WHERE v.user_id=?', [req.user.id]); if (!rows.length) return res.status(404).json({error:'Voter profile not found.'}); res.json(rows[0]); } catch(e){next(e);}
});
router.patch('/me', allowRoles('Voter'), async (req,res,next)=>{
  try { const {phone,address,dob}=req.body; await db.execute('UPDATE voters SET phone=COALESCE(?,phone), address=COALESCE(?,address), dob=COALESCE(?,dob) WHERE user_id=?',[phone ?? null,address ?? null,dob ?? null,req.user.id]); res.json({message:'Voter profile updated.'}); } catch(e){next(e);}
});
router.get('/', allowRoles('BLO','Election Officer','DBA'), async(req,res,next)=>{
  try { const [rows]=await db.execute('SELECT v.id, u.full_name, u.email, v.phone, v.address, v.dob, v.booth_id FROM voters v JOIN users u ON u.id=v.user_id ORDER BY v.id DESC'); res.json(rows); } catch(e){next(e);}
});
module.exports=router;