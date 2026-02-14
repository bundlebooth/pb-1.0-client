import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';
import { ActionButtonGroup, EditButton, DeleteButton } from '../common/UIComponents';

function PoliciesStep({ formData, onInputChange, setFormData, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [newFaq, setNewFaq] = useState({ question: '', answers: [''] });
  const [savingFaq, setSavingFaq] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  // Load existing FAQs
  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadFAQs();
    } else {
      setLoading(false);
    }
  }, [currentUser?.vendorProfileId]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/faqs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const faqsArray = Array.isArray(data) ? data : (data.faqs || []);
        const mappedFaqs = faqsArray.map(faq => {
          const answer = faq.answer || faq.Answer || '';
          let answers = [];
          if (answer.includes('\n• ') || answer.includes('\n- ')) {
            answers = answer.split(/\n[•-]\s*/).filter(a => a.trim());
          } else if (answer.includes('\n')) {
            answers = answer.split('\n').filter(a => a.trim());
          } else {
            answers = [answer];
          }
          return {
            id: faq.id || faq.FAQID,
            question: faq.question || faq.Question,
            answers: answers.length > 0 ? answers : ['']
          };
        });
        setFaqs(mappedFaqs);
        setFormData(prev => ({
          ...prev,
          faqs: mappedFaqs
        }));
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnswer = () => {
    setNewFaq(prev => ({ ...prev, answers: [...prev.answers, ''] }));
  };

  const handleRemoveAnswer = (index) => {
    if (newFaq.answers.length > 1) {
      setNewFaq(prev => ({
        ...prev,
        answers: prev.answers.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAnswerChange = (index, value) => {
    setNewFaq(prev => ({
      ...prev,
      answers: prev.answers.map((a, i) => i === index ? value : a)
    }));
  };

  const handleAddFaq = async () => {
    const validAnswers = newFaq.answers.filter(a => a.trim());
    if (!newFaq.question.trim() || validAnswers.length === 0) {
      showBanner('Please fill in the question and at least one answer', 'error');
      return;
    }

    const formattedAnswer = validAnswers.length === 1 
      ? validAnswers[0] 
      : validAnswers.map(a => `• ${a}`).join('\n');

    if (!currentUser?.vendorProfileId) {
      const newFaqWithId = { 
        id: Date.now(), 
        question: newFaq.question, 
        answers: validAnswers 
      };
      setFaqs(prev => [...prev, newFaqWithId]);
      setFormData(prev => ({
        ...prev,
        faqs: [...(prev.faqs || []), newFaqWithId]
      }));
      setNewFaq({ question: '', answers: [''] });
      showBanner('FAQ added! It will be saved when you complete your profile.', 'success');
      return;
    }

    setSavingFaq(true);
    try {
      const updatedFaqs = [...faqs, { question: newFaq.question, answer: formattedAnswer }];
      
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/faqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ faqs: updatedFaqs.map(f => ({ 
          question: f.question, 
          answer: f.answers ? (f.answers.length === 1 ? f.answers[0] : f.answers.map(a => `• ${a}`).join('\n')) : f.answer 
        })) })
      });

      if (response.ok) {
        showBanner('FAQ added successfully!', 'success');
        setNewFaq({ question: '', answers: [''] });
        loadFAQs();
      } else {
        throw new Error('Failed to add FAQ');
      }
    } catch (error) {
      console.error('Error adding FAQ:', error);
      showBanner('Failed to add FAQ', 'error');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (faqId, index) => {
    if (!currentUser?.vendorProfileId || !faqId) {
      setFaqs(prev => prev.filter((_, i) => i !== index));
      setFormData(prev => ({
        ...prev,
        faqs: prev.faqs.filter((_, i) => i !== index)
      }));
      showBanner('FAQ removed', 'success');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/faqs/${faqId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showBanner('FAQ deleted successfully!', 'success');
        loadFAQs();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      showBanner('Failed to delete FAQ', 'error');
    }
  };

  const handleEditFaq = (index) => {
    const faq = displayFaqs[index];
    setEditingFaq({
      index,
      id: faq.id,
      question: faq.question,
      answers: faq.answers || [faq.answer || '']
    });
  };

  const handleCancelEdit = () => {
    setEditingFaq(null);
  };

  const handleEditAnswerChange = (answerIndex, value) => {
    setEditingFaq(prev => ({
      ...prev,
      answers: prev.answers.map((a, i) => i === answerIndex ? value : a)
    }));
  };

  const handleAddEditAnswer = () => {
    setEditingFaq(prev => ({
      ...prev,
      answers: [...prev.answers, '']
    }));
  };

  const handleRemoveEditAnswer = (answerIndex) => {
    if (editingFaq.answers.length > 1) {
      setEditingFaq(prev => ({
        ...prev,
        answers: prev.answers.filter((_, i) => i !== answerIndex)
      }));
    }
  };

  const handleSaveEdit = async () => {
    const validAnswers = editingFaq.answers.filter(a => a.trim());
    if (!editingFaq.question.trim() || validAnswers.length === 0) {
      showBanner('Please fill in the question and at least one answer', 'error');
      return;
    }

    const formattedAnswer = validAnswers.length === 1 
      ? validAnswers[0] 
      : validAnswers.map(a => `• ${a}`).join('\n');

    if (!currentUser?.vendorProfileId) {
      const updatedFaqs = [...faqs];
      updatedFaqs[editingFaq.index] = {
        ...updatedFaqs[editingFaq.index],
        question: editingFaq.question,
        answers: validAnswers
      };
      setFaqs(updatedFaqs);
      setFormData(prev => ({ ...prev, faqs: updatedFaqs }));
      setEditingFaq(null);
      showBanner('FAQ updated!', 'success');
      return;
    }

    setSavingFaq(true);
    try {
      const updatedFaqs = faqs.map((f, i) => {
        if (i === editingFaq.index) {
          return { question: editingFaq.question, answer: formattedAnswer };
        }
        return { 
          question: f.question, 
          answer: f.answers ? (f.answers.length === 1 ? f.answers[0] : f.answers.map(a => `• ${a}`).join('\n')) : f.answer 
        };
      });

      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/faqs`, {
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
    } finally {
      setSavingFaq(false);
    }
  };

  const displayFaqs = faqs.length > 0 ? faqs : (formData.faqs || []);

  return (
    <div className="policies-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        {/* FAQs Section Header */}
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-question-circle" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Frequently Asked Questions</h3>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Add common questions and answers to help potential clients learn more about your services.
          </p>
        </div>

        {loading && (
          <div className="step-loading-container">
            <div className="spinner"></div>
          </div>
        )}

        {!loading && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Existing FAQs */}
            {displayFaqs.length > 0 && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {displayFaqs.map((faq, index) => (
                  <div 
                    key={faq.id || index} 
                    style={{ 
                      background: 'white', 
                      borderRadius: '12px', 
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Edit Mode */}
                    {editingFaq && editingFaq.index === index ? (
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                            Question
                          </label>
                          <input
                            type="text"
                            value={editingFaq.question}
                            onChange={(e) => setEditingFaq(prev => ({ ...prev, question: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '0.95rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>
                              Answer{editingFaq.answers.length > 1 ? 's' : ''}
                            </label>
                            <button
                              type="button"
                              onClick={handleAddEditAnswer}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 500
                              }}
                            >
                              <i className="fas fa-plus"></i> Add answer
                            </button>
                          </div>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {editingFaq.answers.map((answer, ansIdx) => (
                              <div key={ansIdx} style={{ display: 'flex', gap: '0.5rem' }}>
                                <textarea
                                  value={answer}
                                  onChange={(e) => handleEditAnswerChange(ansIdx, e.target.value)}
                                  rows={2}
                                  style={{
                                    flex: 1,
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                  }}
                                />
                                {editingFaq.answers.length > 1 && (
                                  <button
                                    type="button"
                                    className="action-btn action-btn-delete"
                                    onClick={() => handleRemoveEditAnswer(ansIdx)}
                                    title="Remove answer"
                                    style={{ alignSelf: 'flex-start' }}
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            onClick={handleSaveEdit}
                            disabled={savingFaq}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          >
                            {savingFaq ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#f3f4f6',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* View Mode */}
                        <div style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '0.75rem'
                          }}>
                            <strong style={{ fontSize: '0.95rem', color: '#111827', flex: 1 }}>{faq.question}</strong>
                            <ActionButtonGroup>
                              <EditButton onClick={() => handleEditFaq(index)} />
                              <DeleteButton onClick={() => handleDeleteFaq(faq.id, index)} title="Remove" />
                            </ActionButtonGroup>
                          </div>
                          {/* Display answers */}
                          {(() => {
                            let answers = faq.answers || [faq.answer || ''];
                            if (!Array.isArray(answers)) answers = [answers];
                            answers = answers.map(a => String(a || '').replace(/^[•\-]\s*/, '').trim()).filter(a => a);
                            
                            if (answers.length === 0) {
                              return <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>No answer provided</p>;
                            }
                            
                            return (
                              <div style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                {answers.map((answer, ansIdx) => (
                                  <p key={ansIdx} style={{ margin: ansIdx > 0 ? '0.25rem 0 0' : 0 }}>{answer}</p>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add New FAQ Card */}
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    Question
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Do you travel for events?"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>
                      Answer{newFaq.answers.length > 1 ? 's' : ''}
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewFaq({ ...newFaq, answers: [...newFaq.answers, ''] })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        padding: '0.25rem 0.5rem'
                      }}
                    >
                      <i className="fas fa-plus"></i> Add answer
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {newFaq.answers.map((answer, ansIdx) => (
                      <div key={ansIdx} style={{ display: 'flex', gap: '0.5rem' }}>
                        <textarea
                          placeholder="Provide a detailed answer..."
                          value={answer}
                          onChange={(e) => {
                            const updatedAnswers = [...newFaq.answers];
                            updatedAnswers[ansIdx] = e.target.value;
                            setNewFaq({ ...newFaq, answers: updatedAnswers });
                          }}
                          rows={2}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                        {newFaq.answers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedAnswers = newFaq.answers.filter((_, i) => i !== ansIdx);
                              setNewFaq({ ...newFaq, answers: updatedAnswers });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0.5rem',
                              alignSelf: 'flex-start'
                            }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddFaq}
                  disabled={savingFaq || !newFaq.question.trim() || !newFaq.answers.some(a => a.trim())}
                  className="btn btn-primary"
                  style={{ justifySelf: 'start', padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                >
                  {savingFaq ? (
                    <><i className="fas fa-spinner fa-spin"></i> Adding...</>
                  ) : (
                    <><i className="fas fa-plus"></i> Add FAQ</>
                  )}
                </button>
              </div>
            </div>

            {/* Empty State */}
            {displayFaqs.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                background: '#f9fafb', 
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <i className="fas fa-comments" style={{ fontSize: '2.5rem', color: '#d1d5db', marginBottom: '1rem', display: 'block' }}></i>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                  No FAQs added yet. Add your first question above to help clients learn more about your services.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PoliciesStep;
