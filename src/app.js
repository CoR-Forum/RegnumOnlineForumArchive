import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import threadsRouter from './routes/threads.js';
import usersRouter from './routes/users.js';
import statsRouter from './routes/stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "*"],
      styleSrc: ["'self'", "'unsafe-inline'", "*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "*"],
      imgSrc: ["'self'", "data:", "*"],
      connectSrc: ["'self'", "*"]
    }
  }
}));

app.use(compression());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000000, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/threads', threadsRouter);
app.use('/api/users', usersRouter);
app.use('/api/stats', statsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Sitemap.xml for search engines
app.get('/sitemap.xml', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/xml');
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const today = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/users</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/stats</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    
    // Add language-specific pages
    const languages = ['Español', 'English', 'Português', 'Deutsch', 'Français', 'Italiano'];
    languages.forEach(lang => {
      sitemap += `
  <url>
    <loc>${baseUrl}/?language=${encodeURIComponent(lang)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    });
    
    // Add thread URLs (sample for top threads)
    try {
      // This would need to be implemented based on your database structure
      // For now, we'll add a placeholder structure
      for (let i = 1; i <= 50; i++) {
        sitemap += `
  <url>
    <loc>${baseUrl}/threads/${i}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    } catch (error) {
      console.warn('Could not generate thread URLs for sitemap:', error);
    }
    
    sitemap += `
</urlset>`;
    
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt for search engines
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /api/
Disallow: /assets/*.png$

Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`);
});

// Enhanced SEO middleware for search engine crawlers
app.get('*', async (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot/i.test(userAgent);
  
  // For search engine crawlers, serve static content with enhanced metadata
  if (isCrawler && !req.path.startsWith('/api/')) {
    try {
      let title = 'Regnum Online Forum Archive';
      let description = 'Champions of Regnum community forum archive. Browse threads, posts, and discussions from the Regnum Online gaming community.';
      let keywords = 'Regnum Online, Champions of Regnum, forum archive, gaming community, discussions, threads, posts';
      let canonicalUrl = req.originalUrl;
      
      // Generate specific metadata based on route
      if (req.path.includes('/threads/')) {
        const threadId = req.path.split('/threads/')[1];
        if (threadId && !isNaN(threadId)) {
          title = `Thread ${threadId} - Regnum Online Forum Archive`;
          description = `Discussion thread from the Champions of Regnum community forum archive. Browse posts and conversations from the gaming community.`;
          keywords += `, thread ${threadId}, discussion, posts, conversation`;
        }
      } else if (req.path.includes('/users')) {
        title = 'Community Members - Regnum Online Forum Archive';
        description = 'Browse the Champions of Regnum community members and their forum participation. View user profiles and contribution statistics.';
        keywords += ', users, members, community, profiles';
      } else if (req.path.includes('/stats')) {
        title = 'Forum Statistics - Regnum Online Forum Archive';
        description = 'Champions of Regnum forum archive statistics including post counts, active users, languages, and community analytics.';
        keywords += ', statistics, analytics, forum stats, data, metrics';
      } else if (req.query.language) {
        const language = req.query.language;
        title = `${language} Discussions - Regnum Online Forum Archive`;
        description = `Browse ${language} discussions and threads from the Champions of Regnum community. Find posts in ${language} language.`;
        keywords += `, ${language}, language, discussions, threads`;
        canonicalUrl = `/?language=${encodeURIComponent(language)}`;
        
        if (req.query.category) {
          const category = req.query.category;
          title = `${category} (${language}) - Regnum Online Forum Archive`;
          description = `Browse ${category} discussions in ${language} from the Champions of Regnum community.`;
          keywords += `, ${category}, category`;
          canonicalUrl = `/?language=${encodeURIComponent(language)}&category=${encodeURIComponent(category)}`;
        }
      }
      
      // Read the main HTML file and inject metadata
      const fs = await import('fs');
      let html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
      
      // Replace title
      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      
      // Update meta description
      html = html.replace(
        /<meta name="description" content="[^"]*">/i, 
        `<meta name="description" content="${description}">`
      );
      
      // Update keywords
      html = html.replace(
        /<meta name="keywords" content="[^"]*">/i, 
        `<meta name="keywords" content="${keywords}">`
      );
      
      // Update canonical URL
      html = html.replace(
        /<link rel="canonical" href="[^"]*">/i, 
        `<link rel="canonical" href="${canonicalUrl}">`
      );
      
      // Update Open Graph tags
      html = html.replace(
        /<meta property="og:title" content="[^"]*">/i, 
        `<meta property="og:title" content="${title}">`
      );
      html = html.replace(
        /<meta property="og:description" content="[^"]*">/i, 
        `<meta property="og:description" content="${description}">`
      );
      html = html.replace(
        /<meta property="og:url" content="[^"]*">/i, 
        `<meta property="og:url" content="${canonicalUrl}">`
      );
      
      // Add structured data for better SEO
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Regnum Online Forum Archive",
        "description": description,
        "url": `${req.protocol}://${req.get('host')}`,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${req.protocol}://${req.get('host')}/?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      };
      
      // Insert structured data before closing head tag
      const structuredDataScript = `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`;
      html = html.replace('</head>', `${structuredDataScript}\n</head>`);
      
      res.send(html);
    } catch (error) {
      console.error('Error serving SEO content:', error);
      res.sendFile(path.join(__dirname, '../public/index.html'));
    }
  } else {
    // Serve normal SPA for regular users
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Regnum Forum Archive server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Open http://localhost:${PORT} to view the static forum archive`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export { app };