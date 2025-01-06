const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

supabase.from('users')
    .select('*')
    .then(({ data, error }) => {
        if (error) {
            console.error('Supabase接続中にエラーが発生しました：', error.message);
        } else {
            console.log('Supabaseに接続しました');
        }
    })
    .catch(error => {
        console.error('Supabase接続中にエラーが発生しました：', error.message);
    });

module.exports = { supabase };