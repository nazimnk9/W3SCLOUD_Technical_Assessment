let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  fetchAuthStatus();
  fetchLeads(1);

  // Event Listeners
  document.getElementById('refreshAuthBtn')?.addEventListener('click', refreshAuthToken);
  document.getElementById('btnRefreshLeads')?.addEventListener('click', () => fetchLeads(currentPage));
  document.getElementById('btnPrevPage')?.addEventListener('click', () => {
    if (currentPage > 1) fetchLeads(currentPage - 1);
  });
  document.getElementById('btnNextPage')?.addEventListener('click', () => fetchLeads(currentPage + 1));
  document.getElementById('createLeadForm')?.addEventListener('submit', handleCreateLead);
  document.getElementById('btnTestDuplicate')?.addEventListener('click', handleTestDuplicate);
  document.getElementById('btnFetchById')?.addEventListener('click', handleFetchById);
});

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

// 1. Fetch OAuth Status
async function fetchAuthStatus() {
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
  }
}

// 2. Refresh Token Manually
async function refreshAuthToken() {
  try {
    const res = await fetch('/auth/refresh', { method: 'POST' });
    const data = await res.json();
    displayResponse(res.status, data);
    fetchAuthStatus();
  } catch (err) {
    displayResponse(500, { error: err.message });
  }
}

// 3. Fetch Leads
async function fetchLeads(page = 1) {
  const tbody = document.getElementById('leadsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading leads from Zoho CRM...</td></tr>';
  }

  try {
    const res = await fetch(`/api/leads?page=${page}&perPage=10`);
    const data = await res.json();
    displayResponse(res.status, data);

    if (res.ok && data.data) {
      currentPage = page;
      document.getElementById('pageIndicator').textContent = `Page ${currentPage}`;
      document.getElementById('btnPrevPage').disabled = currentPage <= 1;
      document.getElementById('btnNextPage').disabled = !data.pagination?.moreRecords;

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
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color:var(--accent-red)">${escapeHtml(data.message || 'Error loading leads')}</td></tr>`;
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color:var(--accent-red)">Connection error. Please check Zoho OAuth connection.</td></tr>`;
    }
  }
}

// 4. Create Lead
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

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    displayResponse(res.status, data);

    if (res.ok && data.data?.zohoRecordId) {
      document.getElementById('searchRecordId').value = data.data.zohoRecordId;
      renderSingleRecord(data.data.lead);
      fetchLeads(1);
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
  }
}

// 5. Test Duplicate Conflict
async function handleTestDuplicate() {
  const email = document.getElementById('email').value;
  const payload = {
    firstName: document.getElementById('firstName').value || 'Duplicate',
    lastName: document.getElementById('lastName').value || 'Test',
    company: document.getElementById('company').value || 'Test Co',
    email: email,
    phone: document.getElementById('phone').value,
  };

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    displayResponse(res.status, data);
  } catch (err) {
    displayResponse(500, { error: err.message });
  }
}

// 6. Fetch Record By ID
async function handleFetchById() {
  const id = document.getElementById('searchRecordId').value.trim();
  if (!id) return;

  try {
    const res = await fetch(`/api/leads/${id}`);
    const data = await res.json();
    displayResponse(res.status, data);

    if (res.ok && data.data) {
      renderSingleRecord(data.data);
    } else {
      document.getElementById('singleRecordResult').innerHTML = `
        <div style="color:var(--accent-red); padding:1rem; text-align:center;">
          ❌ ${escapeHtml(data.message || 'Lead not found')}
        </div>
      `;
    }
  } catch (err) {
    displayResponse(500, { error: err.message });
  }
}

function selectLead(id) {
  document.getElementById('searchRecordId').value = id;
  handleFetchById();
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

// 7. Error Handling Demonstrations
async function triggerError(endpoint, method = 'GET') {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    displayResponse(res.status, data);
  } catch (err) {
    displayResponse(500, { error: err.message });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
