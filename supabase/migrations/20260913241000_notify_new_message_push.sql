-- Extends the existing new-message trigger to also fire a push
-- notification, using the exact same "first unread message of a streak"
-- gate already used for email -- a rapid back-and-forth sends one push,
-- not one per message.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_recipient_id uuid;
  v_sender_name text;
  v_recipient_email text;
  v_prior_unread_count int;
  v_webhook_secret text;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end
    into v_recipient_id
  from conversations c
  where c.id = new.conversation_id;

  select full_name into v_sender_name from profiles where id = new.sender_id;

  insert into notifications (recipient_id, type, payload)
  values (
    v_recipient_id,
    'new_message',
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id,
      'sender_name', coalesce(v_sender_name, 'A student'),
      'preview', left(new.content, 140)
    )
  );

  -- Only email/push on the first unread message of a streak, not every
  -- message in a rapid back-and-forth -- the recipient is already
  -- "notified" once until they read up to this point.
  select count(*) into v_prior_unread_count
  from messages
  where conversation_id = new.conversation_id
    and sender_id = new.sender_id
    and read_at is null
    and id <> new.id;

  if v_prior_unread_count = 0 then
    select decrypted_secret into v_webhook_secret
    from vault.decrypted_secrets where name = 'email_webhook_secret';

    if v_webhook_secret is not null then
      select email into v_recipient_email from auth.users where id = v_recipient_id;

      if v_recipient_email is not null then
        perform net.http_post(
          url := 'https://clpfcygjtkjeafvscdwb.supabase.co/functions/v1/send-message-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', v_webhook_secret
          ),
          body := jsonb_build_object(
            'to', v_recipient_email,
            'senderName', coalesce(v_sender_name, 'A student'),
            'preview', left(new.content, 140),
            'conversationId', new.conversation_id
          )
        );
      end if;

      perform net.http_post(
        url := 'https://clpfcygjtkjeafvscdwb.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', v_webhook_secret
        ),
        body := jsonb_build_object(
          'recipientId', v_recipient_id,
          'senderName', coalesce(v_sender_name, 'A student'),
          'preview', left(new.content, 140),
          'conversationId', new.conversation_id
        )
      );
    end if;
  end if;

  return new;
end;
$function$;
