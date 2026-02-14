/**
 * Automation Section - Admin Dashboard
 * Automated workflows, email templates, email logs and queue monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatRelativeTime } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';
import UniversalModal, { FormModal, ConfirmationModal } from '../../UniversalModal';
import { FormField, FormTextareaField, ToggleSwitch } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function AutomationSection() {
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState('rules');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [showCancelEmailModal, setShowCancelEmailModal] = useState(false);
  const [emailToCancel, setEmailToCancel] = useState(null);

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Email logs
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailQueue, setEmailQueue] = useState([]);
  const [emailQueueStats, setEmailQueueStats] = useState({ pending: 0, processing: 0, sent: 0, failed: 0 });
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsLimit = 20;

  // Automation Rules
  const [automationRules, setAutomationRules] = useState([
    { id: 1, name: 'Booking Reminder', trigger: '24 hours before booking', action: 'Send reminder email to client', enabled: true },
    { id: 2, name: 'Review Request', trigger: '2 days after booking completion', action: 'Send review request email', enabled: true },
    { id: 3, name: 'Payment Failure Follow-up', trigger: 'When payment fails', action: 'Send payment retry email', enabled: true },
    { id: 4, name: 'Vendor Inactivity Alert', trigger: 'Vendor inactive for 30 days', action: 'Send re-engagement email', enabled: false },
    { id: 5, name: 'New Booking Alert', trigger: 'When new booking is made', action: 'Send notification to vendor', enabled: true }
  ]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  const fetchEmailTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getEmailTemplates();
      const templatesArray = Array.isArray(data?.templates) ? data.templates : Array.isArray(data) ? data : [];
      setEmailTemplates(templatesArray);
    } catch (err) {
      console.error('Error fetching email templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmailLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getEmailLogs({ page: logsPage, limit: logsLimit });
      const logsArray = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];
      setEmailLogs(logsArray);
      setLogsTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching email logs:', err);
    } finally {
      setLoading(false);
    }
  }, [logsPage]);

  const fetchEmailQueue = useCallback(async () => {
    try {
      setLoading(true);
      const [queueData, statsData] = await Promise.all([
        adminApi.getEmailQueue({ page: logsPage, limit: logsLimit }),
        adminApi.getEmailQueueStats().catch((err) => { console.error('Stats error:', err); return null; })
      ]);
      const queueArray = Array.isArray(queueData?.emails) ? queueData.emails : Array.isArray(queueData) ? queueData : [];
      setEmailQueue(queueArray);
      // API returns { success: true, stats: { pending, processing, sent, failed } }
      if (statsData && statsData.stats) {
        setEmailQueueStats(statsData.stats);
      } else if (statsData && typeof statsData === 'object') {
        setEmailQueueStats(statsData);
      } else {
        setEmailQueueStats({ pending: 0, processing: 0, sent: 0, failed: 0 });
      }
      setLogsTotal(queueData.total || 0);
    } catch (err) {
      console.error('Error fetching email queue:', err);
    } finally {
      setLoading(false);
    }
  }, [logsPage]);

  useEffect(() => {
    if (activeTab === 'templates') fetchEmailTemplates();
    else if (activeTab === 'logs') fetchEmailLogs();
    else if (activeTab === 'queue') fetchEmailQueue();
  }, [activeTab, fetchEmailTemplates, fetchEmailLogs, fetchEmailQueue]);

  useEffect(() => {
    setLogsPage(1);
  }, [activeTab]);

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

  const handleCancelEmail = (emailId) => {
    setEmailToCancel(emailId);
    setShowCancelEmailModal(true);
  };

  const handlePreviewQueueEmail = async (email) => {
    try {
      const queueId = email.QueueID || email.id;
      const result = await adminApi.getEmailQueuePreview(queueId);
      if (result.success && result.preview) {
        setSelectedEmail({
          ...email,
          htmlBody: result.preview.htmlBody,
          Subject: result.preview.subject || email.Subject,
          RecipientEmail: result.preview.recipientEmail || email.RecipientEmail
        });
      } else {
        setSelectedEmail(email);
      }
      setShowEmailPreview(true);
    } catch (err) {
      console.error('Failed to fetch email preview:', err);
      setSelectedEmail(email);
      setShowEmailPreview(true);
    }
  };

  const confirmCancelEmail = async () => {
    if (!emailToCancel) return;
    setShowCancelEmailModal(false);
    try {
      await adminApi.cancelQueuedEmail(emailToCancel, 'Cancelled by admin');
      fetchEmailQueue();
    } catch (err) {
      console.error('Failed to cancel email:', err);
    } finally {
      setEmailToCancel(null);
    }
  };

  const renderRules = () => (
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

  const renderTemplates = () => (
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
                          const fullTemplate = await adminApi.getEmailTemplate(template.TemplateID || template.id);
                          setSelectedTemplate(fullTemplate.template || fullTemplate);
                          setShowTemplateModal(true);
                        } catch (err) {
                          console.error('Error fetching template:', err);
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

  const renderEmailLogs = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Email Logs</h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchEmailLogs}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      {loading ? (
        <div className="admin-loading"><div className="admin-loading-spinner"></div><p>Loading...</p></div>
      ) : emailLogs.length === 0 ? (
        <div className="admin-empty-state"><i className="fas fa-envelope"></i><h3>No Email Logs</h3><p>No emails sent yet</p></div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Recipient</th><th>Subject</th><th>Template</th><th>Status</th><th>Sent</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {emailLogs.map((log, idx) => (
                  <tr key={log.LogID || log.id || idx}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{log.RecipientEmail || log.email}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{log.RecipientName || ''}</div>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.Subject || log.subject}</td>
                    <td><span className="admin-badge admin-badge-info">{log.TemplateName || log.template || 'Custom'}</span></td>
                    <td><span className={`admin-badge ${log.Status === 'sent' || log.status === 'sent' ? 'admin-badge-success' : 'admin-badge-danger'}`}>{log.Status || log.status}</span></td>
                    <td>{formatRelativeTime(log.SentAt || log.sentAt || log.createdAt)}</td>
                    <td>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => { setSelectedEmail(log); setShowEmailPreview(true); }}><i className="fas fa-eye"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Math.ceil(logsTotal / logsLimit) > 1 && (
            <div className="admin-pagination">
              <div className="admin-pagination-info">Page {logsPage} of {Math.ceil(logsTotal / logsLimit)}</div>
              <div className="admin-pagination-buttons">
                <button className="admin-pagination-btn" onClick={() => setLogsPage(p => p - 1)} disabled={logsPage === 1}><i className="fas fa-chevron-left"></i></button>
                <button className="admin-pagination-btn" onClick={() => setLogsPage(p => p + 1)} disabled={logsPage >= Math.ceil(logsTotal / logsLimit)}><i className="fas fa-chevron-right"></i></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderEmailQueue = () => (
    <>
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-stat-card"><div className="admin-stat-icon blue"><i className="fas fa-clock"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats?.pending || 0}</div><div className="admin-stat-label">Pending</div></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon orange"><i className="fas fa-spinner"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats?.processing || 0}</div><div className="admin-stat-label">Processing</div></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon green"><i className="fas fa-check"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats?.sent || 0}</div><div className="admin-stat-label">Sent Today</div></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon red"><i className="fas fa-times"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats?.failed || 0}</div><div className="admin-stat-label">Failed</div></div></div>
        </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Email Queue</h3>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchEmailQueue}><i className="fas fa-sync-alt"></i> Refresh</button>
        </div>
        {loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner"></div><p>Loading...</p></div>
        ) : emailQueue.length === 0 ? (
          <div className="admin-empty-state"><i className="fas fa-inbox"></i><h3>Queue Empty</h3><p>No emails in queue</p></div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Scheduled</th><th>Attempts</th><th>Actions</th></tr></thead>
              <tbody>
                {emailQueue.map((email, idx) => (
                  <tr key={email.QueueID || email.id || idx}>
                    <td>{email.RecipientEmail || email.email}</td>
                    <td>{email.Subject || email.subject}</td>
                    <td><span className={`admin-badge ${email.Status === 'pending' ? 'admin-badge-warning' : email.Status === 'sent' ? 'admin-badge-success' : 'admin-badge-danger'}`}>{email.Status || email.status}</span></td>
                    <td>{formatRelativeTime(email.ScheduledAt || email.scheduledAt)}</td>
                    <td>{email.Attempts || 0}</td>
                    <td style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => handlePreviewQueueEmail(email)}><i className="fas fa-eye"></i></button>
                      {(email.Status === 'pending') && (<button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleCancelEmail(email.QueueID || email.id)}><i className="fas fa-times"></i></button>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
          <i className="fas fa-robot" style={{ marginRight: '0.5rem' }}></i>Automation Rules
        </button>
        <button className={`admin-tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
          <i className="fas fa-envelope-open-text" style={{ marginRight: '0.5rem' }}></i>Email Templates
        </button>
        <button className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <i className="fas fa-history" style={{ marginRight: '0.5rem' }}></i>Email Logs
        </button>
        <button className={`admin-tab ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>
          <i className="fas fa-inbox" style={{ marginRight: '0.5rem' }}></i>Email Queue
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'rules' && renderRules()}
      {activeTab === 'templates' && renderTemplates()}
      {activeTab === 'logs' && renderEmailLogs()}
      {activeTab === 'queue' && renderEmailQueue()}

      {/* Email Template Modal */}
      <FormModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Edit Email Template"
        onSave={handleSaveTemplate}
        saving={saving}
        saveLabel="Save Template"
        size="large"
      >
        {selectedTemplate && (
          <div>
            <FormField
              label="Template Name"
              value={selectedTemplate.Name || selectedTemplate.name || ''}
              disabled
            />
            <FormField
              label="Subject"
              value={selectedTemplate.Subject || selectedTemplate.subject || ''}
              onChange={(e) => setSelectedTemplate({ 
                ...selectedTemplate, 
                Subject: e.target.value, 
                subject: e.target.value 
              })}
            />
            <FormTextareaField
              label="Body (HTML)"
              value={selectedTemplate.bodyHtml || selectedTemplate.Body || selectedTemplate.body || selectedTemplate.fullHtml || ''}
              onChange={(e) => setSelectedTemplate({ 
                ...selectedTemplate, 
                bodyHtml: e.target.value,
                Body: e.target.value, 
                body: e.target.value 
              })}
              rows={10}
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Available variables: {'{{userName}}'}, {'{{bookingId}}'}, {'{{vendorName}}'}, {'{{eventDate}}'}, {'{{amount}}'}
            </p>
          </div>
        )}
      </FormModal>

      {/* Automation Rule Modal */}
      <FormModal
        isOpen={showRuleModal}
        onClose={() => { setShowRuleModal(false); setSelectedRule(null); }}
        title={selectedRule?.id ? 'Edit Automation Rule' : 'Add Automation Rule'}
        onSave={handleSaveRule}
        saving={saving}
        saveLabel="Save Rule"
      >
        {selectedRule && (
          <div>
            <FormField
              label="Rule Name"
              required
              value={selectedRule.name || ''}
              onChange={(e) => setSelectedRule({ ...selectedRule, name: e.target.value })}
              placeholder="e.g., Booking Reminder"
            />
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Trigger</label>
              <select
                value={selectedRule.trigger || ''}
                onChange={(e) => setSelectedRule({ ...selectedRule, trigger: e.target.value })}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              >
                <option value="">Select trigger...</option>
                <option value="24 hours before booking">24 hours before booking</option>
                <option value="48 hours before booking">48 hours before booking</option>
                <option value="1 week before booking">1 week before booking</option>
                <option value="When new booking is made">When new booking is made</option>
                <option value="When booking is confirmed">When booking is confirmed</option>
                <option value="When booking is cancelled">When booking is cancelled</option>
                <option value="When payment fails">When payment fails</option>
                <option value="2 days after booking completion">2 days after booking completion</option>
                <option value="Vendor inactive for 30 days">Vendor inactive for 30 days</option>
                <option value="User inactive for 30 days">User inactive for 30 days</option>
              </select>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Action</label>
              <select
                value={selectedRule.action || ''}
                onChange={(e) => setSelectedRule({ ...selectedRule, action: e.target.value })}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              >
                <option value="">Select action...</option>
                <option value="Send reminder email to client">Send reminder email to client</option>
                <option value="Send reminder email to vendor">Send reminder email to vendor</option>
                <option value="Send notification to vendor">Send notification to vendor</option>
                <option value="Send notification to client">Send notification to client</option>
                <option value="Send review request email">Send review request email</option>
                <option value="Send payment retry email">Send payment retry email</option>
                <option value="Send re-engagement email">Send re-engagement email</option>
                <option value="Send cancellation confirmation">Send cancellation confirmation</option>
              </select>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <ToggleSwitch
                checked={selectedRule.enabled !== false}
                onChange={(e) => setSelectedRule({ ...selectedRule, enabled: e.target.checked })}
                label="Enable this rule"
              />
            </div>
          </div>
        )}
      </FormModal>

      {/* Email Preview Modal */}
      <UniversalModal isOpen={showEmailPreview} onClose={() => setShowEmailPreview(false)} title="Email Preview" size="large">
        {selectedEmail && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                <strong>To:</strong><span>{selectedEmail.RecipientEmail || selectedEmail.email}</span>
                <strong>Subject:</strong><span>{selectedEmail.Subject || selectedEmail.subject}</span>
                <strong>Sent:</strong><span>{formatDate(selectedEmail.SentAt || selectedEmail.sentAt)}</span>
              </div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', maxHeight: '400px', overflow: 'auto' }}>
              {(selectedEmail.htmlBody || selectedEmail.HtmlBody || selectedEmail.body) ? (
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || selectedEmail.HtmlBody || selectedEmail.body }} />
              ) : selectedEmail.Variables ? (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}><strong>Template:</strong> {selectedEmail.TemplateName || selectedEmail.TemplateKey}</p>
                  <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}><strong>Variables:</strong></p>
                  <pre style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', overflow: 'auto' }}>
                    {typeof selectedEmail.Variables === 'string' ? selectedEmail.Variables : JSON.stringify(selectedEmail.Variables, null, 2)}
                  </pre>
                </div>
              ) : (
                <p style={{ color: '#9ca3af' }}>No preview available</p>
              )}
            </div>
          </div>
        )}
      </UniversalModal>

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

      {/* Cancel Email Confirmation */}
      <ConfirmationModal
        isOpen={showCancelEmailModal}
        onClose={() => { setShowCancelEmailModal(false); setEmailToCancel(null); }}
        title="Cancel Queued Email"
        message="Are you sure you want to cancel this queued email?"
        confirmLabel="Cancel Email"
        cancelLabel="Go Back"
        onConfirm={confirmCancelEmail}
        variant="warning"
      />
    </div>
  );
}

export default AutomationSection;
