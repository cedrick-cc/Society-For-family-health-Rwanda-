require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const programRoutes = require('./routes/programRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const volunteerDashboardRoutes = require('./routes/volunteerDashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messagingRoutes = require('./routes/messagingRoutes');
const fieldReportRoutes = require('./routes/fieldReportRoutes');
const fieldManagerDashboardRoutes = require('./routes/fieldManagerDashboardRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const activityRoutes = require('./routes/activityRoutes');
const auditRoutes = require('./routes/auditRoutes');
const exportRoutes = require('./routes/exportRoutes');
const volunteerListRoutes = require('./routes/volunteerListRoutes');
const scheduledActivityRoutes = require('./routes/scheduledActivityRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/volunteer', volunteerDashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', messagingRoutes);
app.use('/api/field-reports', fieldReportRoutes);
app.use('/api/field-manager', fieldManagerDashboardRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/volunteers', volunteerListRoutes);
app.use('/api/scheduled-activities', scheduledActivityRoutes);

app.get('/', (req, res) => {
  res.send('SFH OMS Backend Running');
});

const resourceService = require('./services/resourceService');

app.listen(PORT, async () => {
  try {
    await resourceService.ensureDefaultResources();
  } catch (e) {
    console.warn('Default resources seed skipped:', e.message);
  }
  console.log(`Server listening on port ${PORT}`);
});
