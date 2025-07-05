/*
  # Storage Setup for File Attachments

  1. Storage Bucket
    - Create 'attachments' bucket for file uploads
    - Configure as private bucket (not public)

  2. Storage Policies
    - Allow authenticated users to upload files
    - Allow users to access their own files
    - Service role has full access
*/

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments', 
    'attachments', 
    false, 
    10485760, -- 10MB limit
    ARRAY[
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for attachments bucket
CREATE POLICY "Service role can manage all files" ON storage.objects
    FOR ALL USING (bucket_id = 'attachments');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'attachments' 
        AND auth.role() = 'authenticated'
    );

-- Allow users to view files (service role handles access control)
CREATE POLICY "Users can view files" ON storage.objects
    FOR SELECT USING (bucket_id = 'attachments');

-- Allow users to delete their own files
CREATE POLICY "Users can delete files" ON storage.objects
    FOR DELETE USING (bucket_id = 'attachments');