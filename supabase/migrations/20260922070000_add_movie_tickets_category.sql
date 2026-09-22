-- Adds a Movie Tickets resale category. Deliberately does NOT include train
-- tickets — reselling IRCTC-booked tickets is a criminal offense under
-- Section 143 of the Railways Act, 1989 (ticket touting). Movie tickets
-- carry real fraud risk too (a QR code/screenshot can be resold to more
-- than one buyer with no way for CampusBin to invalidate the original),
-- but that's a moderation/reporting problem, not a legal one.

insert into public.categories (name, slug)
values ('Movie Tickets', 'movie-tickets');
