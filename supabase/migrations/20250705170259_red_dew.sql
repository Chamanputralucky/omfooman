-- Supabase Storage Setup for File Attachments

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
CREATE POLICY "Users can upload attachments" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Users can view attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'attachments');

CREATE POLICY "Users can update attachments" ON storage.objects
    FOR UPDATE USING (bucket_id = 'attachments');

CREATE POLICY "Users can delete attachments" ON storage.objects
    FOR DELETE USING (bucket_id = 'attachments');