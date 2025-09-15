import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopNavbar from './TopNavbar';
import AppointmentForm from './AppointmentForm';
import Footer from './Footer';
import { Users, QrCode, ArrowRight, Calendar, Clock, Activity, TrendingUp, AlertTriangle, CheckCircle, FileText, Heart, Shield, Plus } from 'lucide-react';

const Dashboard = () => {
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalPatients: 0,
    recentScans: 0,
    todayAppointments: 0,
    criticalPatients: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch patients data
        const patientsResponse = await fetch('http://localhost:5000/api/patients', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (patientsResponse.ok) {
          const patientsData = await patientsResponse.json();
          const patients = patientsData.patients || [];
          
          // Calculate statistics
          const criticalPatients = patients.filter(patient => 
            patient.medicalHistory && patient.medicalHistory.some(condition => 
              condition.status === 'active' || condition.status === 'chronic'
            )
          ).length;

          setDashboardData({
            totalPatients: patients.length,
            recentScans: Math.floor(Math.random() * 10) + 5, // Simulated recent scans
            todayAppointments: Math.floor(Math.random() * 8) + 2, // Simulated today's appointments
            criticalPatients: criticalPatients,
            recentActivity: [
              {
                id: 1,
                type: 'scan',
                message: 'Patient QR code scanned',
                patient: 'John Doe',
                time: '2 minutes ago'
              },
              {
                id: 2,
                type: 'record',
                message: 'Medical record updated',
                patient: 'Sarah Johnson',
                time: '15 minutes ago'
              },
              {
                id: 3,
                type: 'alert',
                message: 'Critical condition detected',
                patient: 'Mike Wilson',
                time: '1 hour ago'
              },
              {
                id: 4,
                type: 'scan',
                message: 'New patient registered',
                patient: 'Emily Davis',
                time: '2 hours ago'
              }
            ]
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <TopNavbar />
      <div className="pt-16 relative z-10">
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard Content */}
          {location.pathname === '/dashboard' ? (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome back, {user?.name}!</h1>
                <p className="text-gray-600 dark:text-gray-300">Here's what's happening with your practice today.</p>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading dashboard data...</span>
                </div>
              )}

              {/* Dashboard Content */}
              {!loading && (
                <>
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Patients</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.totalPatients}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                          <QrCode className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Recent Scans</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.recentScans}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                          <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Appointments</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.todayAppointments}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Critical Patients</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.criticalPatients}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions + Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    {/* Quick Actions */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
                      <div className="space-y-4">
                        <button
                          onClick={() => navigate('/scan')}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-center flex-1">
                            <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                              Scan Patient QR
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                        </button>

                        <button
                          onClick={() => navigate('/patients')}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-center flex-1">
                            <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                              View All Patients
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                        </button>

                        <button
                          onClick={() => setShowAppointmentForm(true)}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-center flex-1">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <Plus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                              Schedule Appointment
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {dashboardData.recentActivity.map((activity) => (
                          <ActivityItem
                            key={activity.id}
                            color={activity.type === 'scan' ? 'blue' : activity.type === 'record' ? 'green' : activity.type === 'alert' ? 'red' : 'purple'}
                            title={activity.message}
                            subtitle={`${activity.patient} • ${activity.time}`}
                            icon={activity.type === 'scan' ? QrCode : activity.type === 'record' ? FileText : activity.type === 'alert' ? AlertTriangle : Users}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        {/* Footer */}
        <Footer />
      </div>

      {/* Appointment Form Modal */}
      <AppointmentForm
        isOpen={showAppointmentForm}
        onClose={() => setShowAppointmentForm(false)}
        onSuccess={(appointment) => {
          console.log('Appointment created:', appointment);
          // You can add logic here to refresh dashboard data or show a success message
        }}
      />
    </div>
  );
};

export default Dashboard;

/* ----------------------
 * Helper Components
 * --------------------*/
const ActivityItem = ({ color, title, subtitle, icon: Icon }) => (
  <div className="flex items-start space-x-3">
    <div className={`p-2 rounded-lg ${
      color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' : 
      color === 'green' ? 'bg-green-100 dark:bg-green-900/30' : 
      color === 'red' ? 'bg-red-100 dark:bg-red-900/30' : 
      'bg-purple-100 dark:bg-purple-900/30'
    }`}>
      <Icon className={`h-4 w-4 ${
        color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 
        color === 'green' ? 'text-green-600 dark:text-green-400' : 
        color === 'red' ? 'text-red-600 dark:text-red-400' : 
        'text-purple-600 dark:text-purple-400'
      }`} />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{title}</span>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  </div>
);

const OverviewStat = ({ label, value, change }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
    <span className="text-sm text-green-600 font-medium">{change}</span>
  </div>
);
