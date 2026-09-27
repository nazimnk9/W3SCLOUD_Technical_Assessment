let currentPage = 1;
let modalActionCallback = null;
let errorModalActionCallback = null;

document.addEventListener('DOMContentLoaded', () => {
  renderPageNumbers(1);
  fetchAuthStatus();
  fetchLeads(1);

  // Event Listeners
  document.getElementById('refreshAuthBtn')?.addEventListener('click', refreshAuthToken);
  document.getElementById('btnManualRefresh')?.addEventListener('click', refreshAuthToken);
  document.getElementById('btnRefreshLeads')?.addEventListener('click', () => fetchLeads(currentPage));
  document.getElementById('btnPrevPage')?.addEventListener('click', () => {
    if (currentPage > 1) fetchLeads(currentPage - 1);
  });
  document.getElementById('btnNextPage')?.addEventListener('click', () => fetchLeads(currentPage + 1));
  document.getElementById('createLeadForm')?.addEventListener('submit', handleCreateLead);
  document.getElementById('btnTestDuplicate')?.addEventListener('click', handleTestDuplicate);
  document.getElementById('btnFetchById')?.addEventListener('click', handleFetchById);

  // Close modals on backdrop click
  document.getElementById('successModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'successModal') closeSuccessModal();
  });
  document.getElementById('errorModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'errorModal') closeErrorModal();
  });
});

// --- UI Loaders & Modals ---

function showLoader(text = 'Fetching data from Zoho CRM...') {
  const loader = document.getElementById('globalLoader');
  const textEl = document.getElementById('loaderText');
  if (textEl) textEl.textContent = text;
  if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.add('hidden');
}

// Success Modal
function showSuccessModal({ title, message, details = [], actionText = '🔍 View Record in Step 4', onAction = null }) {
  const modal = document.getElementById('successModal');
  const titleEl = document.getElementById('modalTitle');
  const messageEl = document.getElementById('modalMessage');
  const detailsBox = document.getElementById('modalDetailsBox');
  const actionBtn = document.getElementById('modalActionBtn');

  if (titleEl) titleEl.textContent = title || 'Operation Successful!';
  if (messageEl) messageEl.textContent = message || 'Your request was processed successfully.';

  if (detailsBox) {
    if (details && details.length > 0) {
      detailsBox.style.display = 'block';
      detailsBox.innerHTML = `
        <div class="modal-details-grid">
          ${details
            .map(
              (item) => `
            <div class="modal-detail-item">
              <span class="modal-detail-label">${escapeHtml(item.label)}</span>
              <span class="modal-detail-val">${escapeHtml(item.value)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } else {
      detailsBox.style.display = 'none';
      detailsBox.innerHTML = '';
    }
  }

  if (actionBtn) {
    if (actionText) {
      actionBtn.style.display = 'inline-flex';
      actionBtn.textContent = actionText;
      modalActionCallback = onAction;
    } else {
      actionBtn.style.display = 'none';
      modalActionCallback = null;
    }
  }

  if (modal) modal.classList.remove('hidden');
}

function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) modal.classList.add('hidden');
  modalActionCallback = null;
}

function handleModalAction() {
  if (typeof modalActionCallback === 'function') {
    modalActionCallback();
  }
  closeSuccessModal();
}

// Error Modal
function showErrorModal({
  title,
  message,
  statusCode = 'Error',
  details = [],
  helpText = null,
  actionText = null,
  onAction = null,
}) {
  const modal = document.getElementById('errorModal');
  const titleEl = document.getElementById('errorModalTitle');
  const messageEl = document.getElementById('errorModalMessage');
  const badgeEl = document.getElementById('errorStatusCodeBadge');
  const detailsBox = document.getElementById('errorModalDetailsBox');
  const actionBtn = document.getElementById('errorModalActionBtn');

  const is502 = statusCode === 502 || statusCode === '502' || statusCode === 'BAD_GATEWAY';

  if (is502) {
    if (badgeEl) {
      badgeEl.textContent = 'HTTP 502 • Bad Gateway';
      badgeEl.className = 'badge badge-red';
    }
    if (titleEl) titleEl.textContent = title || '☁️ Zoho CRM Server Error (502 Bad Gateway)';
    if (messageEl) {
      messageEl.textContent =
        message ||
        'The upstream Zoho CRM API server encountered an internal server error or gateway anomaly while processing this request.';
    }
  } else {
    if (badgeEl) {
      badgeEl.textContent = `HTTP ${statusCode}`;
      badgeEl.className = statusCode === 409 ? 'badge badge-purple' : 'badge badge-red';
    }
    if (titleEl) titleEl.textContent = title || 'Request Failed';
    if (messageEl) messageEl.textContent = message || 'An error occurred while processing the request.';
  }

  if (detailsBox) {
    if ((details && details.length > 0) || helpText) {
      detailsBox.style.display = 'block';
      let html = '';

      if (details && details.length > 0) {
        html += `
          <div class="modal-details-grid">
            ${details
              .map(
                (item) => `
              <div class="modal-detail-item ${item.fullWidth ? 'full-width' : ''}">
                <span class="modal-detail-label">${escapeHtml(item.label)}</span>
                <span class="modal-detail-val">${escapeHtml(item.value)}</span>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }

      if (helpText) {
        html += `
          <div class="modal-help-banner">
            <span class="modal-help-icon">💡</span>
            <span class="modal-help-text">${escapeHtml(helpText)}</span>
          </div>
        `;
      }

      detailsBox.innerHTML = html;
    } else {
      detailsBox.style.display = 'none';
      detailsBox.innerHTML = '';
    }
  }

  if (actionBtn) {
    if (actionText) {
      actionBtn.style.display = 'inline-flex';
      actionBtn.textContent = actionText;
      errorModalActionCallback = onAction;
    } else {
      actionBtn.style.display = 'none';
      errorModalActionCallback = null;
    }
  }

  if (modal) modal.classList.remove('hidden');
}

// Professional API Error Handler & Modal Generator
function handleGenericApiError(res, data, { fallbackTitle = '❌ Request Failed', onRetry = null } = {}) {
  const status = res?.status || (typeof res === 'number' ? res : 500);
  const is502 = status === 502;
  const is401 = status === 401;
  const is403 = status === 403;
  const is404 = status === 404;
  const is429 = status === 429;
  const is409 = status === 409;
  const is400 = status === 400;

  let title = fallbackTitle;
  let message = data?.message || 'An error occurred while processing the request.';
  const details = [];

  if (is502) {
    title = '☁️ Zoho CRM Server Error (502 Bad Gateway)';
    message =
      data?.message ||
      'The upstream Zoho CRM API server encountered an internal server error or gateway anomaly while executing this operation.';
    details.push({ label: 'Upstream Service', value: 'Zoho CRM Cloud REST API v8' });
    details.push({ label: 'Error Code', value: data?.error?.code || 'ZOHO_UPSTREAM_UNAVAILABLE' });
    if (data?.error?.zohoCode) {
      details.push({ label: 'Remote Zoho Status', value: data.error.zohoCode });
    }
    if (data?.error?.details?.gatewayNode) {
      details.push({ label: 'Gateway Node', value: data.error.details.gatewayNode });
    }
    details.push({
      label: 'Root Cause & Diagnosis',
      value: 'Remote Zoho API server returned an internal 502 Bad Gateway response or is temporarily unreachable.',
      fullWidth: true,
    });
  } else if (is401) {
    title = '🔒 Zoho CRM Authentication Failed (401)';
    details.push({ label: 'Error Code', value: data?.error?.code || 'OAUTH_INVALID_TOKEN' });
    details.push({ label: 'Token Status', value: 'Access Token Missing or Expired' });
  } else if (is403) {
    title = '🛑 OAuth Scope Mismatch (403)';
    details.push({ label: 'Error Code', value: data?.error?.code || 'OAUTH_SCOPE_MISMATCH' });
    details.push({ label: 'Required Permission', value: 'ZohoCRM.modules.ALL, ZohoCRM.settings.ALL' });
  } else if (is404) {
    title = '📂 Record / Module Not Found (404)';
    details.push({ label: 'Error Code', value: data?.error?.code || 'NOT_FOUND' });
  } else if (is429) {
    title = '⏳ Rate Limit Exceeded (429)';
    details.push({ label: 'Error Code', value: data?.error?.code || 'ZOHO_RATE_LIMIT_EXCEEDED' });
    details.push({ label: 'Rate Limit Info', value: 'Zoho CRM API concurrency threshold reached.' });
  } else if (is400) {
    title = '📝 400 Validation Error';
    details.push({ label: 'Error Code', value: data?.error?.code || 'VALIDATION_ERROR' });
    if (data?.error?.details?.fields) {
      details.push({
        label: 'Missing / Invalid Fields',
        value: Object.entries(data.error.details.fields)
          .map(([f, msg]) => `${f}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join(' | '),
        fullWidth: true,
      });
    }
  } else if (is409) {
    title = '⚠️ Duplicate Lead Conflict (409)';
    details.push({ label: 'Error Code', value: data?.error?.code || 'CONFLICT' });
    if (data?.error?.details?.existingRecordId) {
      details.push({ label: 'Existing Record ID', value: data.error.details.existingRecordId });
    }
    if (data?.error?.details?.existingName) {
      details.push({ label: 'Existing Name', value: data.error.details.existingName });
    }
  } else {
    if (data?.error?.code) details.push({ label: 'Error Code', value: data.error.code });
  }

  const helpText =
    data?.error?.documentationHelp ||
    (is502
      ? 'Recommended Resolution: Wait 5-10 seconds and retry the operation, or verify Zoho CRM service status at status.zoho.com.'
      : is401
      ? 'Recommended Resolution: Click "Re-authorize Zoho CRM" to initiate the OAuth 2.0 authorization flow.'
      : null);

  const actionText = onRetry
    ? '🔄 Retry Request'
    : is401
    ? '🔗 Re-authorize Zoho CRM'
    : data?.error?.details?.existingRecordId
    ? '🔍 View Existing in Step 4'
    : null;

  const onAction = onRetry
    ? onRetry
    : is401
    ? () => {
        window.location.href = '/auth/zoho?redirect=true';
      }
    : data?.error?.details?.existingRecordId
    ? () => {
        selectLead(data.error.details.existingRecordId);
      }
    : null;

  showErrorModal({
    title,
    message,
    statusCode: status,
    details,
    helpText,
    actionText,
    onAction,
  });
}

function closeErrorModal() {
  const modal = document.getElementById('errorModal');
  if (modal) modal.classList.add('hidden');
  errorModalActionCallback = null;
}

function handleErrorModalAction() {
  if (typeof errorModalActionCallback === 'function') {
    errorModalActionCallback();
  }
  closeErrorModal();
}

// Update Response Inspector
function displayResponse(status, data) {
  const badge = document.getElementById('responseStatusBadge');
  const pre = document.getElementById('responseJson');

  if (badge) {
    badge.textContent = `Status: ${status}`;
    if (status >= 200 && status < 300) {
      badge.className = 'badge badge-green';
    } else if (status === 409) {
      badge.className = 'badge badge-purple';
    } else if (status >= 400) {
      badge.className = 'badge badge-red';
    } else {
      badge.className = 'badge badge-mono';
    }
  }

  if (pre) {
    pre.innerHTML = `<code>${JSON.stringify(data, null, 2)}</code>`;
  }
}

// 1. Fetch OAuth Status (GET)
async function fetchAuthStatus(showOverlay = false) {
  if (showOverlay) showLoader('Checking Zoho CRM OAuth status...');
  try {
    const res = await fetch('/auth/status');
    const data = await res.json();
    displayResponse(res.status, data);

    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const metaAccounts = document.getElementById('metaAccountsUrl');
    const metaApi = document.getElementById('metaApiBaseUrl');
    const metaTokenStatus = document.getElementById('metaTokenStatus');
    const metaExpires = document.getElementById('metaExpiresAt');

    if (data.data?.authenticated) {
      statusDot.className = 'dot dot-connected';
      statusText.textContent = data.data.isAccessTokenValid ? 'Connected & Active' : 'Token Expired (Auto-Refresh Ready)';
      metaTokenStatus.textContent = data.data.isAccessTokenValid ? 'Valid (Active)' : 'Needs Refresh (Ready)';
    } else {
      statusDot.className = 'dot dot-disconnected';
      statusText.textContent = 'Not Connected';
      metaTokenStatus.textContent = 'None / Pending Auth';
    }

    if (metaAccounts) metaAccounts.textContent = data.data?.accountsUrl || '-';
    if (metaApi) metaApi.textContent = data.data?.apiBaseUrl || '-';
    if (metaExpires) metaExpires.textContent = data.data?.expiresAt ? new Date(data.data.expiresAt).toLocaleTimeString() : 'N/A';
  } catch (err) {
    console.error('Failed to fetch auth status:', err);
  } finally {
    if (showOverlay) hideLoader();
  }
}

// 2. Refresh Token Manually (POST)
async function refreshAuthToken() {
  showLoader('Renewing Zoho CRM access token via refresh token...');
  try {
    const res = await fetch('/auth/refresh', { method: 'POST' });
    const data = await res.json();
    displayResponse(res.status, data);
    await fetchAuthStatus(false);

    if (res.ok) {
      showSuccessModal({
        title: '🔑 Access Token Renewed!',
        message: 'Successfully generated a fresh access token using Zoho OAuth refresh token.',
        details: [
          { label: 'Token Status', value: 'Active / Valid' },
          { label: 'Expires At', value: data.data?.expiresAt ? new Date(data.data.expiresAt).toLocaleTimeString() : 'In 1 Hour' },
          { label: 'Auth Strategy', value: 'Silent Background Refresh' },
          { label: 'HTTP Status', value: '200 OK' },
        ],
        actionText: 'Done',
        onAction: null,
      });
    } else {
      handleGenericApiError(res, data, {
        fallbackTitle: '❌ Token Renewal Failed',
        onRetry: () => refreshAuthToken(),
      });
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
    handleGenericApiError(500, { message: err.message }, { fallbackTitle: '❌ Connection Error' });
  } finally {
    hideLoader();
  }
}

let maxDiscoveredPages = 1;

function renderPageNumbers(totalPages = 1) {
  const container = document.getElementById('pageNumbersList');
  const badge = document.getElementById('totalPagesBadge');
  const pageIndicator = document.getElementById('pageIndicator');

  const total = Math.max(1, totalPages || maxDiscoveredPages || 1);

  if (badge) {
    badge.textContent = `Total Pages: ${total}`;
  }

  if (pageIndicator) {
    pageIndicator.textContent = `Page ${currentPage} of ${total}`;
  }

  if (!container) return;

  let html = '';
  for (let p = 1; p <= total; p++) {
    html += `<button class="page-num-btn ${p === currentPage ? 'active' : ''}" onclick="fetchLeads(${p})">${p}</button>`;
  }
  container.innerHTML = html;
}

// 3. Fetch Leads (GET)
async function fetchLeads(page = 1) {
  const tbody = document.getElementById('leadsTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="inline-loader">
            <div class="inline-spinner"></div>
            <span>Retrieving records from Zoho CRM (Page ${page})...</span>
          </div>
        </td>
      </tr>`;
  }

  showLoader(`Loading leads from Zoho CRM (Page ${page})...`);

  try {
    const res = await fetch(`/api/leads?page=${page}&perPage=10`);
    const data = await res.json();
    displayResponse(res.status, data);

    if (res.ok && data.data) {
      currentPage = page;

      // Dynamically calculate total pages from API response pagination
      const moreRecords = data.pagination?.moreRecords ?? false;
      if (moreRecords) {
        maxDiscoveredPages = Math.max(maxDiscoveredPages, currentPage + 1);
      } else {
        maxDiscoveredPages = Math.max(maxDiscoveredPages, currentPage);
      }

      const totalPages = data.pagination?.totalPages || maxDiscoveredPages;
      renderPageNumbers(totalPages);

      const btnPrev = document.getElementById('btnPrevPage');
      const btnNext = document.getElementById('btnNextPage');

      if (btnPrev) btnPrev.disabled = currentPage <= 1;
      if (btnNext) btnNext.disabled = !moreRecords;

      if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No Leads found in Zoho CRM.</td></tr>';
        return;
      }

      tbody.innerHTML = data.data
        .map(
          (lead) => `
        <tr>
          <td><code style="color:#93c5fd; font-size:0.8rem;">${lead.id}</code></td>
          <td><strong>${escapeHtml(lead.fullName)}</strong></td>
          <td>${escapeHtml(lead.email || 'N/A')}</td>
          <td>${escapeHtml(lead.company || 'N/A')}</td>
          <td>${escapeHtml(lead.phone || 'N/A')}</td>
          <td><span class="badge badge-blue">${escapeHtml(lead.leadStatus || 'Active')}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="selectLead('${lead.id}')">View</button>
          </td>
        </tr>
      `
        )
        .join('');
    } else {
      renderPageNumbers(maxDiscoveredPages);
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color:var(--accent-red)">${escapeHtml(data.message || 'Error loading leads')}</td></tr>`;
      if (res.status === 502) {
        handleGenericApiError(res, data, {
          fallbackTitle: '☁️ Zoho CRM Server Error (502 Bad Gateway)',
          onRetry: () => fetchLeads(page),
        });
      }
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
    renderPageNumbers(maxDiscoveredPages);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color:var(--accent-red)">Connection error. Please check Zoho OAuth connection.</td></tr>`;
    }
  } finally {
    hideLoader();
  }
}

// 4. Create Lead (POST)
async function handleCreateLead(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    firstName: form.firstName.value,
    lastName: form.lastName.value,
    company: form.company.value,
    email: form.email.value,
    phone: form.phone.value,
    leadStatus: form.leadStatus.value,
  };

  showLoader('Creating Lead record in Zoho CRM v8...');

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    displayResponse(res.status, data);

    if (res.ok && data.data?.zohoRecordId) {
      const createdLead = data.data.lead;
      const recordId = data.data.zohoRecordId;

      document.getElementById('searchRecordId').value = recordId;
      renderSingleRecord(createdLead);
      fetchLeads(1);

      // Show beautiful success modal on POST API
      showSuccessModal({
        title: '🎉 Lead Created in Zoho CRM!',
        message: `New Lead successfully created and verified in Zoho CRM with Record ID: ${recordId}`,
        details: [
          { label: 'Zoho Record ID', value: recordId },
          { label: 'Full Name', value: createdLead.fullName },
          { label: 'Company', value: createdLead.company },
          { label: 'Email', value: createdLead.email },
          { label: 'Phone', value: createdLead.phone || 'N/A' },
          { label: 'Lead Status', value: createdLead.leadStatus || 'Not Contacted' },
        ],
        actionText: '🔍 View in Step 4',
        onAction: () => {
          const step4 = document.getElementById('sec-retrieve');
          if (step4) {
            step4.scrollIntoView({ behavior: 'smooth', block: 'center' });
            step4.classList.add('highlight-pulse');
            setTimeout(() => step4.classList.remove('highlight-pulse'), 1800);
          }
        },
      });
    } else {
      handleGenericApiError(res, data, {
        fallbackTitle: res.status === 409 ? '⚠️ Duplicate Lead Conflict' : '❌ Lead Creation Failed',
        onRetry: res.status === 502 ? () => handleCreateLead(e) : null,
      });
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
    handleGenericApiError(500, { message: err.message }, { fallbackTitle: '❌ Connection Error' });
  } finally {
    hideLoader();
  }
}

// 5. Test Duplicate Conflict (POST)
async function handleTestDuplicate() {
  const email = document.getElementById('email').value;
  const payload = {
    firstName: document.getElementById('firstName').value || 'Duplicate',
    lastName: document.getElementById('lastName').value || 'Test',
    company: document.getElementById('company').value || 'Test Co',
    email: email,
    phone: document.getElementById('phone').value,
  };

  showLoader('Checking Zoho CRM for duplicate lead records...');

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    displayResponse(res.status, data);

    if (res.ok) {
      showSuccessModal({
        title: 'Lead Created!',
        message: 'No duplicate was detected; created new Lead.',
        details: [{ label: 'Zoho Record ID', value: data.data?.zohoRecordId || 'Created' }],
      });
    } else {
      handleGenericApiError(res, data, {
        fallbackTitle: '⚠️ Duplicate Conflict Detected (409)',
        onRetry: res.status === 502 ? () => handleTestDuplicate() : null,
      });
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
    handleGenericApiError(500, { message: err.message }, { fallbackTitle: '❌ Connection Error' });
  } finally {
    hideLoader();
  }
}

// 6. Fetch Record By ID (GET)
async function handleFetchById() {
  const id = document.getElementById('searchRecordId').value.trim();
  if (!id) return;

  const container = document.getElementById('singleRecordResult');
  if (container) {
    container.innerHTML = `
      <div class="inline-loader">
        <div class="inline-spinner"></div>
        <span>Retrieving Zoho CRM record ${escapeHtml(id)}...</span>
      </div>`;
  }

  showLoader(`Fetching Zoho CRM record ID: ${id}...`);

  try {
    const res = await fetch(`/api/leads/${id}`);
    const data = await res.json();
    displayResponse(res.status, data);

    if (res.ok && data.data) {
      renderSingleRecord(data.data);
    } else {
      if (container) {
        container.innerHTML = `
          <div style="color:var(--accent-red); padding:1rem; text-align:center;">
            ❌ ${escapeHtml(data.message || 'Lead not found')}
          </div>
        `;
      }
      if (res.status === 502) {
        handleGenericApiError(res, data, {
          fallbackTitle: '☁️ Zoho CRM Server Error (502 Bad Gateway)',
          onRetry: () => handleFetchById(),
        });
      }
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
  } finally {
    hideLoader();
  }
}

function selectLead(id) {
  document.getElementById('searchRecordId').value = id;
  handleFetchById();
  const step4 = document.getElementById('sec-retrieve');
  if (step4) {
    step4.scrollIntoView({ behavior: 'smooth', block: 'center' });
    step4.classList.add('highlight-pulse');
    setTimeout(() => step4.classList.remove('highlight-pulse'), 1800);
  }
}

function renderSingleRecord(lead) {
  const container = document.getElementById('singleRecordResult');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
      <div>
        <h3 style="font-size:1.1rem; color:#fff;">${escapeHtml(lead.fullName)}</h3>
        <span style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(lead.company)}</span>
      </div>
      <span class="badge badge-green">ID: ${lead.id}</span>
    </div>
    <div class="grid grid-2" style="font-size:0.85rem;">
      <div><strong>Email:</strong> ${escapeHtml(lead.email || 'N/A')}</div>
      <div><strong>Phone:</strong> ${escapeHtml(lead.phone || 'N/A')}</div>
      <div><strong>Status:</strong> ${escapeHtml(lead.leadStatus || 'N/A')}</div>
      <div><strong>Created At:</strong> ${lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}</div>
    </div>
  `;
}

// 7. Error Handling Demonstrations (GET & POST)
async function triggerError(endpoint, method = 'GET') {
  showLoader(`Executing demo ${method} error request...`);
  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    displayResponse(res.status, data);

    if (!res.ok) {
      handleGenericApiError(res, data, {
        fallbackTitle: 'API Error Demo',
        onRetry: () => triggerError(endpoint, method),
      });
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
    handleGenericApiError(500, { message: err.message }, { fallbackTitle: '❌ Connection Error' });
  } finally {
    hideLoader();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
