/**
 * Settings Section - Admin Dashboard
 * Platform settings, commission, security, and email configuration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';
import { ConfirmationModal, FormModal } from '../../UniversalModal';
import { FormField, FormTextareaField, ToggleSwitch } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function SettingsSection() {
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState('commission');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Commission settings
  const [commissionSettings, setCommissionSettings] = useState({
    platformFeePercent: 10,
    stripeFeePercent: 2.9,
    stripeFeeFixed: 0.30,
    taxRate: 0,
    minimumPayout: 50
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    require2FAForAdmins: false,
    require2FAForVendors: false,
    require2FAForUsers: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 30
  });

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const fetchCommissionSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCommissionSettings();
      setCommissionSettings({
        platformFeePercent: data.platformFeePercent || data.PlatformFeePercent || 10,
        stripeFeePercent: data.stripeFeePercent || data.StripeFeePercent || 2.9,
        stripeFeeFixed: data.stripeFeeFixed || data.StripeFeeFixed || 0.30,
        taxRate: data.taxRate || data.TaxRate || 0,
        minimumPayout: data.minimumPayout || data.MinimumPayout || 50
      });
    } catch (err) {
      console.error('Error fetching commission settings:', err);
      setError('Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSecuritySettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.get2FASettings();
      // Backend returns { settings: { require2FAForAdmins, require2FAForVendors, ... } }
      const s = data?.settings || data || {};
      setSecuritySettings({
        require2FAForAdmins: s.require2FAForAdmins || false,
        require2FAForVendors: s.require2FAForVendors || false,
        require2FAForUsers: s.require2FAForUsers || false,
        sessionTimeout: s.sessionTimeout || 60,
        maxLoginAttempts: s.failedLoginLockout || 5,
        lockoutDuration: s.lockDurationMinutes || 30
      });
    } catch (err) {
      console.error('Error fetching security settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmailTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getEmailTemplates();
      // Ensure emailTemplates is always an array
      const templatesArray = Array.isArray(data?.templates) ? data.templates : Array.isArray(data) ? data : [];
      setEmailTemplates(templatesArray);
    } catch (err) {
      console.error('Error fetching email templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'commission') fetchCommissionSettings();
    else if (activeTab === 'security') fetchSecuritySettings();
    else if (activeTab === 'email') fetchEmailTemplates();
  }, [activeTab, fetchCommissionSettings, fetchSecuritySettings, fetchEmailTemplates]);

  const handleSaveCommission = async () => {
    setSaving(true);
    try {
      await adminApi.updateCommissionSettings(commissionSettings);
      showSuccess('Commission settings saved successfully');
    } catch (err) {
      console.error('Error saving commission settings:', err);
      showError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    try {
      // Map frontend field names to backend expected names
      await adminApi.update2FASettings({
        require2FAForAdmins: securitySettings.require2FAForAdmins,
        require2FAForVendors: securitySettings.require2FAForVendors,
        require2FAForUsers: securitySettings.require2FAForUsers,
        sessionTimeout: securitySettings.sessionTimeout,
        failedLoginLockout: securitySettings.maxLoginAttempts,
        lockDurationMinutes: securitySettings.lockoutDuration
      });
      showSuccess('Security settings saved successfully');
    } catch (err) {
      console.error('Error saving security settings:', err);
      showError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await adminApi.updateEmailTemplate(selectedTemplate.TemplateID || selectedTemplate.id, selectedTemplate);
      setShowTemplateModal(false);
      fetchEmailTemplates();
      showSuccess('Template saved successfully');
    } catch (err) {
      console.error('Error saving template:', err);
      showError('Failed to save template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setSaving(true);
    try {
      await adminApi.toggleMaintenanceMode(!maintenanceMode);
      setMaintenanceMode(!maintenanceMode);
      setShowMaintenanceModal(false);
    } catch (err) {
      console.error('Error toggling maintenance mode:', err);
      showError('Failed to toggle maintenance mode: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderCommission = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Commission & Fee Settings</h3>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      ) : (
        <div className="admin-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Platform Fee (%)
              </label>
              <input
                type="number"
                value={commissionSettings.platformFeePercent}
                onChange={(e) => setCommissionSettings({ 
                  ...commissionSettings, 
                  platformFeePercent: parseFloat(e.target.value) || 0 
                })}
                min="0"
                max="100"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Percentage taken from each booking
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Stripe Fee (%)
              </label>
              <input
                type="number"
                value={commissionSettings.stripeFeePercent}
                onChange={(e) => setCommissionSettings({ 
                  ...commissionSettings, 
                  stripeFeePercent: parseFloat(e.target.value) || 0 
                })}
                min="0"
                max="10"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Stripe processing fee percentage
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Stripe Fixed Fee ($)
              </label>
              <input
                type="number"
                value={commissionSettings.stripeFeeFixed}
                onChange={(e) => setCommissionSettings({ 
                  ...commissionSettings, 
                  stripeFeeFixed: parseFloat(e.target.value) || 0 
                })}
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Fixed fee per transaction
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={commissionSettings.taxRate}
                onChange={(e) => setCommissionSettings({ 
                  ...commissionSettings, 
                  taxRate: parseFloat(e.target.value) || 0 
                })}
                min="0"
                max="50"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Default tax rate for bookings
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Minimum Payout ($)
              </label>
              <input
                type="number"
                value={commissionSettings.minimumPayout}
                onChange={(e) => setCommissionSettings({ 
                  ...commissionSettings, 
                  minimumPayout: parseFloat(e.target.value) || 0 
                })}
                min="0"
                step="1"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Minimum balance required for vendor payout
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ marginBottom: '1rem' }}>Fee Calculator Preview</h4>
            <div style={{ 
              background: '#f9fafb', 
              padding: '1rem', 
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Booking Amount</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>$100.00</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Platform Fee</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626' }}>
                  -${(100 * commissionSettings.platformFeePercent / 100).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Stripe Fee</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626' }}>
                  -${(100 * commissionSettings.stripeFeePercent / 100 + commissionSettings.stripeFeeFixed).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Vendor Receives</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981' }}>
                  ${(100 - (100 * commissionSettings.platformFeePercent / 100) - (100 * commissionSettings.stripeFeePercent / 100 + commissionSettings.stripeFeeFixed)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button 
              className="admin-btn admin-btn-primary"
              onClick={handleSaveCommission}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Commission Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSecurity = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Security Settings</h3>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      ) : (
        <div className="admin-card-body">
          <div style={{ marginBottom: '1.5rem' }}>
            <ToggleSwitch
              checked={securitySettings.require2FAForAdmins}
              onChange={(e) => setSecuritySettings({ ...securitySettings, require2FAForAdmins: e.target.checked })}
              label="Require 2FA for Admin Users"
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '3rem' }}>
              All admin users must enable two-factor authentication
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <ToggleSwitch
              checked={securitySettings.require2FAForVendors}
              onChange={(e) => setSecuritySettings({ ...securitySettings, require2FAForVendors: e.target.checked })}
              label="Require 2FA for Vendors"
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '3rem' }}>
              Vendor accounts must use two-factor authentication
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <ToggleSwitch
              checked={securitySettings.require2FAForUsers}
              onChange={(e) => setSecuritySettings({ ...securitySettings, require2FAForUsers: e.target.checked })}
              label="Require 2FA for Users"
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '3rem' }}>
              Client/user accounts must use two-factor authentication
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ 
                  ...securitySettings, 
                  sessionTimeout: parseInt(e.target.value) || 30 
                })}
                min="5"
                max="480"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Max Login Attempts
              </label>
              <input
                type="number"
                value={securitySettings.maxLoginAttempts}
                onChange={(e) => setSecuritySettings({ 
                  ...securitySettings, 
                  maxLoginAttempts: parseInt(e.target.value) || 5 
                })}
                min="3"
                max="10"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={securitySettings.lockoutDuration}
                onChange={(e) => setSecuritySettings({ 
                  ...securitySettings, 
                  lockoutDuration: parseInt(e.target.value) || 15 
                })}
                min="5"
                max="60"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button 
              className="admin-btn admin-btn-primary"
              onClick={handleSaveSecurity}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Security Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderEmail = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Email Templates</h3>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading templates...</p>
        </div>
      ) : emailTemplates.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-envelope"></i>
          <h3>No Templates</h3>
          <p>No email templates configured</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Subject</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {emailTemplates.map((template) => (
                <tr key={template.TemplateID || template.id}>
                  <td style={{ fontWeight: 500 }}>{template.Name || template.name}</td>
                  <td>{template.Subject || template.subject}</td>
                  <td>{formatDate(template.UpdatedAt || template.updatedAt)}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={async () => {
                        try {
                          // Fetch full template with body content
                          const fullTemplate = await adminApi.getEmailTemplate(template.TemplateID || template.id);
                          setSelectedTemplate(fullTemplate.template || fullTemplate);
                          setShowTemplateModal(true);
                        } catch (err) {
                          console.error('Error fetching template:', err);
                          // Fallback to basic template data
                          setSelectedTemplate(template);
                          setShowTemplateModal(true);
                        }
                      }}
                    >
                      <i className="fas fa-pen"></i> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Automation Rules state and handlers
  const [automationRules, setAutomationRules] = useState([
    { id: 1, name: 'Booking Reminder', trigger: '24 hours before booking', action: 'Send reminder email to client', enabled: true },
    { id: 2, name: 'Review Request', trigger: '2 days after booking completion', action: 'Send review request email', enabled: true },
    { id: 3, name: 'Payment Failure Follow-up', trigger: 'When payment fails', action: 'Send payment retry email', enabled: true },
    { id: 4, name: 'Vendor Inactivity Alert', trigger: 'Vendor inactive for 30 days', action: 'Send re-engagement email', enabled: false },
    { id: 5, name: 'New Booking Alert', trigger: 'When new booking is made', action: 'Send notification to vendor', enabled: true }
  ]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  const handleToggleRule = (ruleId) => {
    setAutomationRules(rules => rules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const handleSaveRule = () => {
    if (selectedRule) {
      if (selectedRule.id) {
        setAutomationRules(rules => rules.map(r => r.id === selectedRule.id ? selectedRule : r));
      } else {
        setAutomationRules(rules => [...rules, { ...selectedRule, id: Date.now() }]);
      }
    }
    setShowRuleModal(false);
    setSelectedRule(null);
  };

  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  const handleDeleteRule = (ruleId) => {
    setRuleToDelete(ruleId);
    setShowDeleteRuleModal(true);
  };

  const confirmDeleteRule = () => {
    if (ruleToDelete) {
      setAutomationRules(rules => rules.filter(r => r.id !== ruleToDelete));
    }
    setShowDeleteRuleModal(false);
    setRuleToDelete(null);
  };

  const renderAutomation = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Automation Rules</h3>
        <button 
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => { setSelectedRule({ name: '', trigger: '', action: '', enabled: true }); setShowRuleModal(true); }}
        >
          <i className="fas fa-plus"></i> Add Rule
        </button>
      </div>
      <div className="admin-card-body">
        {automationRules.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-robot"></i>
            <h3>No Automation Rules</h3>
            <p>Create automation rules to automate common tasks</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {automationRules.map((rule) => (
              <div 
                key={rule.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${rule.enabled ? '#5086E8' : '#d1d5db'}`
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '8px', 
                  background: rule.enabled ? 'rgba(80, 134, 232, 0.1)' : '#e5e7eb',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: '1rem'
                }}>
                  <i className="fas fa-robot" style={{ color: rule.enabled ? '#5086E8' : '#9ca3af' }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{rule.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    <i className="fas fa-clock" style={{ marginRight: '0.5rem' }}></i>{rule.trigger}
                    <span style={{ margin: '0 0.5rem' }}>→</span>
                    {rule.action}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ToggleSwitch
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                  />
                  <button 
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={() => { setSelectedRule(rule); setShowRuleModal(true); }}
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                  <button 
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderMaintenance = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Maintenance Mode</h3>
      </div>
      <div className="admin-card-body">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '1rem',
          background: maintenanceMode ? 'rgba(239, 68, 68, 0.08)' : '#f9fafb',
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Maintenance Mode is {maintenanceMode ? 'ON' : 'OFF'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              {maintenanceMode 
                ? 'The platform is currently in maintenance mode. Only admins can access.'
                : 'The platform is operating normally.'}
            </div>
          </div>
          <button
            className={`admin-btn ${maintenanceMode ? 'admin-btn-success' : 'admin-btn-danger'}`}
            onClick={() => setShowMaintenanceModal(true)}
          >
            {maintenanceMode ? 'Disable' : 'Enable'} Maintenance
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'commission' ? 'active' : ''}`}
          onClick={() => setActiveTab('commission')}
        >
          Commission & Fees
        </button>
        <button
          className={`admin-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button
          className={`admin-tab ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          Maintenance
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'commission' && renderCommission()}
      {activeTab === 'security' && renderSecurity()}
      {activeTab === 'maintenance' && renderMaintenance()}

      {/* Maintenance Confirmation */}
      <ConfirmationModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title={maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
        message={maintenanceMode 
          ? 'Are you sure you want to disable maintenance mode? The platform will be accessible to all users.'
          : 'Are you sure you want to enable maintenance mode? Only admins will be able to access the platform.'}
        confirmLabel={saving ? 'Processing...' : 'Confirm'}
        onConfirm={handleToggleMaintenance}
        variant={maintenanceMode ? 'success' : 'danger'}
      />

      {/* Delete Rule Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteRuleModal}
        onClose={() => { setShowDeleteRuleModal(false); setRuleToDelete(null); }}
        title="Delete Automation Rule"
        message="Are you sure you want to delete this automation rule?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteRule}
        variant="danger"
      />

    </div>
  );
}

export default SettingsSection;
