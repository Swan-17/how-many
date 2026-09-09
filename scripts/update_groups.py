from pathlib import Path
import re

p = Path('index.html')
s = p.read_text()

s, n = re.subn(
    r'          <label>GROUP NAME</label><input type="text" id="create-group-name"[^\n]*>\n          <label style="margin-top: 8px; display: block;">UNIQUE CODE</label>\n          <input type="text" id="create-group-code"[^\n]*>\n          <button class="btn-submit" onclick="createGroup\(\)">Create & Become Host</button>',
    '''          <label>GROUP NAME</label><input type="text" id="create-group-name" placeholder="e.g. Friday Drinks">
          <p style="font-size: 11px; color: var(--text-muted); margin: 8px 0 0;">A unique 5-character join code will be generated automatically.</p>
          <button class="btn-submit" onclick="createGroup()">Create & Become Host</button>''', s, count=1)
print('create UI:', n)

s, n = re.subn(
    r'          <label>ENTER UNIQUE GROUP CODE</label>\n          <input type="text" id="join-group-code"[^\n]*>\n          <button class="btn-submit" onclick="joinGroup\(\)">Join Group</button>',
    '''          <label>GROUP NAME</label>
          <input type="text" id="join-group-name" placeholder="e.g. Friday Drinks">
          <label style="margin-top: 8px; display: block;">UNIQUE 5-CHARACTER CODE</label>
          <input type="text" id="join-group-code" maxlength="5" autocomplete="off" style="text-transform: uppercase;" placeholder="e.g. A7K2Q">
          <button class="btn-submit" onclick="joinGroup()">Join Group</button>''', s, count=1)
print('join UI:', n)

create_join = '''    function generateGroupCode(length = 5) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    }

    async function createGroup() {
      const name = $('create-group-name').value.trim();
      if (!name) return alert('Enter a group name.');

      let code = null;
      let lastError = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = generateGroupCode();
        const { error } = await sb.from('groups').insert([{ code: candidate, name, host_email: userEmail }]);
        if (!error) { code = candidate; break; }
        lastError = error;
        if (error.code !== '23505') break;
      }
      if (!code) return alert(lastError?.message || 'Could not generate a unique group code. Please try again.');

      const { error: memberError } = await sb.from('group_members').upsert(
        [{ group_code: code, user_email: userEmail, user_name: userName }],
        { onConflict: 'group_code,user_email' }
      );
      if (memberError) return alert(memberError.message);

      $('create-group-name').value = '';
      closeAllExpandables();
      await fetchUserGroups();
      alert(`Group created!\\n\\nGroup: ${name}\\nUnique code: ${code}`);
    }

    async function joinGroup() {
      const name = $('join-group-name').value.trim();
      const code = $('join-group-code').value.trim().toUpperCase();
      if (!name || !code) return alert('Enter the group name and unique 5-character code.');
      if (!/^[A-Z0-9]{5}$/.test(code)) return alert('The group code must be exactly 5 letters and numbers.');

      const { data: grp } = await sb.from('groups').select('*').eq('code', code).maybeSingle();
      if (!grp) return alert('Group code not found.');
      if (grp.name.trim().toLowerCase() !== name.toLowerCase()) return alert('Group name and code do not match.');

      const { error } = await sb.from('group_members').upsert(
        [{ group_code: code, user_email: userEmail, user_name: userName }],
        { onConflict: 'group_code,user_email' }
      );
      if (error) return alert(error.message);

      $('join-group-name').value = '';
      $('join-group-code').value = '';
      closeAllExpandables();
      await fetchUserGroups();
    }'''

s, n = re.subn(r'    async function createGroup\(\) \{.*?\n    \}\n\n    async function joinGroup\(\) \{.*?\n    \}', create_join, s, count=1, flags=re.S)
print('create/join:', n)

share = '''    async function shareGroup(e, code) {
      if (e) e.stopPropagation();
      const group = userJoinedGroups.find(g => g.code === code);
      const groupName = group?.name || 'Group';
      const joinCode = String(code || '').toUpperCase();
      const url = `${window.location.href.split('?')[0]}?join=${encodeURIComponent(joinCode)}`;
      const shareText = `Join my How Many Beers group!\\n\\nGroup: ${groupName}\\nUnique code: ${joinCode}\\n\\n${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: `How Many Beers - ${groupName}`, text: shareText, url });
        } catch (err) {
          if (err?.name !== 'AbortError') console.error('Share failed:', err);
        }
        return;
      }

      try {
        await navigator.clipboard.writeText(shareText);
        alert(`Group invite copied to clipboard!\\n\\nGroup: ${groupName}\\nUnique code: ${joinCode}`);
      } catch (err) {
        prompt('Copy this group invite:', shareText);
      }
    }'''

s, n = re.subn(r'    function shareGroup\(e, code\) \{.*?\n    \}', share, s, count=1, flags=re.S)
print('share:', n)

if 'generateGroupCode' not in s or 'join-group-name' not in s or 'async function shareGroup' not in s:
    raise SystemExit('Group update did not produce expected functions/UI.')

p.write_text(s)
