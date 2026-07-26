import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { childName, childEmail, childPassword, accessToken } = await req.json();
    if (!childName || !childEmail || !childPassword) {
      return Response.json({ error: "Please fill in the child's name, email, and password." }, { status: 400 });
    }
    if (childPassword.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    if (!accessToken) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    // Verify the CALLING user's token ourselves rather than trusting a
    // parent id the client could just send directly - the new child account
    // gets linked to whoever this token actually belongs to, never to an
    // id supplied in the request body.
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );
    const { data: { user: parentUser }, error: authError } = await anonClient.auth.getUser(accessToken);
    if (authError || !parentUser) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // email_confirm: true - the parent is vouching for this account, so
    // there's no separate email owned by the child to confirm.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: childEmail,
      password: childPassword,
      email_confirm: true,
      user_metadata: { full_name: childName }
    });
    if (createError) {
      const message = /already|exists/i.test(createError.message || '')
        ? 'That email is already in use by another account.'
        : (createError.message || 'Could not create the child account.');
      return Response.json({ error: message }, { status: 400 });
    }

    // handle_new_user's trigger already inserted a basic profiles row (full_name
    // from user_metadata) in the same transaction as the auth.users insert
    // above - upsert rather than update so this still succeeds (rather than
    // silently matching zero rows) in the unlikely case that row isn't
    // visible yet.
    const childId = created.user.id;
    const { error: linkError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: childId, full_name: childName, parent_id: parentUser.id }, { onConflict: 'id' });
    if (linkError) {
      return Response.json({ error: `Account created, but couldn't link it to your account: ${linkError.message}` }, { status: 500 });
    }

    return Response.json({ success: true, childId });
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
