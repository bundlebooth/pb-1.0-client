import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';
import { DeleteButton } from '../../common/UIComponents';
import { ConfirmationModal } from '../../UniversalModal';

function FAQsPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [newFaq, setNewFaq] = useState({ question: '', answers: [''] });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null); // { index, id, question, answer }
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState(null);

  // Clear state when vendorProfileId changes
  useEffect(() => {
    setFaqs([]);
    setNewFaq({ question: '', answers: [''] });
    setShowAddForm(false);
    setEditingFaq(null);
  }, [vendorProfileId]);

  useEffect(() => {
    if (vendorProfileId) {
      loadFAQs();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/vendors/${vendorProfileId}/faqs`);
      
      if (response.ok) {
        const data = await response.json();
        // The endpoint returns an array directly
        const faqsArray = Array.isArray(data) ? data : (data.faqs || []);
        setFaqs(faqsArray.map(faq => ({
          id: faq.id || faq.FAQID,
          question: faq.question || faq.Question,
          answer: faq.answer || faq.Answer,
          displayOrder: faq.displayOrder || faq.DisplayOrder
        })));
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFAQ = async (e) => {
    e.preventDefault();
    
    const validAnswers = newFaq.answers.filter(a => a.trim());
    if (!newFaq.question || validAnswers.length === 0) {
      showBanner('Please fill in the question and at least one answer', 'error');
      return;
    }

    try {
      // Load existing FAQs first - API returns array directly
      const existingResponse = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const existingData = existingResponse.ok ? await existingResponse.json() : [];
      // API returns array directly, not { faqs: [] }
      const existingFaqs = Array.isArray(existingData) ? existingData : (existingData.faqs || []);
      
      // Join multiple answers with line breaks for storage
      const combinedAnswer = validAnswers.join('\n\n');
      const updatedFaqs = [...existingFaqs, { question: newFaq.question, answer: combinedAnswer }];
      
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ faqs: updatedFaqs })
      });
      
      if (response.ok) {
        showBanner('FAQ added successfully!', 'success');
        setNewFaq({ question: '', answers: [''] });
        setShowAddForm(false);
        loadFAQs();
      } else {
        throw new Error('Failed to add FAQ');
      }
    } catch (error) {
      console.error('Error adding FAQ:', error);
      showBanner('Failed to add FAQ', 'error');
    }
  };

  const addAnswerField = () => {
    setNewFaq(prev => ({ ...prev, answers: [...prev.answers, ''] }));
  };

  const removeAnswerField = (index) => {
    if (newFaq.answers.length > 1) {
      setNewFaq(prev => ({
        ...prev,
        answers: prev.answers.filter((_, i) => i !== index)
      }));
    }
  };

  const updateAnswer = (index, value) => {
    setNewFaq(prev => ({
      ...prev,
      answers: prev.answers.map((a, i) => i === index ? value : a)
    }));
  };

  const handleDeleteFAQ = (faqId) => {
    setFaqToDelete(faqId);
    setShowDeleteModal(true);
  };

  const confirmDeleteFAQ = async () => {
    if (!faqToDelete) return;
    setShowDeleteModal(false);

    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs/${faqToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        showBanner('FAQ deleted successfully!', 'success');
        loadFAQs();
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      showBanner('Failed to delete FAQ', 'error');
    } finally {
      setFaqToDelete(null);
    }
  };

  const handleEditFAQ = (faq, index) => {
    setEditingFaq({
      index,
      id: faq.id,
      question: faq.question,
      answer: faq.answer
    });
    setShowAddForm(false);
  };

  const handleCancelEdit = () => {
    setEditingFaq(null);
  };

  const handleSaveEdit = async () => {
    if (!editingFaq.question.trim() || !editingFaq.answer.trim()) {
      showBanner('Please fill in both question and answer', 'error');
      return;
    }

    try {
      // Update the FAQ in the array and save all
      const updatedFaqs = faqs.map((faq, idx) => {
        if (idx === editingFaq.index) {
          return { question: editingFaq.question, answer: editingFaq.answer };
        }
        return { question: faq.question, answer: faq.answer };
      });

      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ faqs: updatedFaqs })
      });

      if (response.ok) {
        showBanner('FAQ updated successfully!', 'success');
        setEditingFaq(null);
        loadFAQs();
      } else {
        throw new Error('Failed to update FAQ');
      }
    } catch (error) {
      console.error('Error updating FAQ:', error);
      showBanner('Failed to update FAQ', 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-question-circle"></i>
          </span>
          FAQs
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Create frequently asked questions to help clients learn more about your services and policies.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        <div id="faqs-list">
          {faqs.length === 0 ? (
            <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>No FAQs added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {faqs.map((faq, index) => (
                <div key={faq.id || index} className="panel-list-item" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }}>
                  {editingFaq && editingFaq.index === index ? (
                    /* Edit Mode */
                    <div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                          Question <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={editingFaq.question}
                          onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                          className="panel-input"
                          style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                          Answer <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                          value={editingFaq.answer}
                          onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                          rows={3}
                          className="panel-textarea"
                          style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" onClick={handleSaveEdit} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                          Save Changes
                        </button>
                        <button className="btn btn-outline" onClick={handleCancelEdit} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
                          {faq.question}
                        </h4>
                        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                          {faq.answer}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditFAQ(faq, index)}
                          className="action-btn action-btn-edit"
                          title="Edit"
                          style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                        >
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                        <DeleteButton onClick={() => handleDeleteFAQ(faq.id || index)} title="Remove" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Add FAQ Button/Form */}
        <div style={{ marginTop: '1.5rem' }}>
          {!showAddForm ? (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className="fas fa-plus"></i> Add FAQ
            </button>
          ) : (
            <div className="panel-add-form" style={{ padding: '1.25rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Add New FAQ</h4>
                <button 
                  className="btn btn-outline" 
                  onClick={() => { setShowAddForm(false); setNewFaq({ question: '', answers: [''] }); }}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Question <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  placeholder="e.g., What is your cancellation policy?"
                  className="panel-input"
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Answer <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {newFaq.answers.map((answer, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <textarea
                      value={answer}
                      onChange={(e) => updateAnswer(index, e.target.value)}
                      placeholder="Enter your answer..."
                      rows={2}
                      className="panel-textarea"
                      style={{ flex: 1, padding: '0.625rem 0.875rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem', resize: 'vertical', minHeight: '60px' }}
                    />
                    {newFaq.answers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAnswerField(index)}
                        className="panel-btn-text"
                        style={{ padding: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Remove"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAnswerField}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'none', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--text-light)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <i className="fas fa-plus" style={{ fontSize: '0.7rem' }}></i> Add answer
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleAddFAQ} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  Save FAQ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete FAQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setFaqToDelete(null); }}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteFAQ}
        variant="danger"
      />
    </div>
  );
}

export default FAQsPanel;
