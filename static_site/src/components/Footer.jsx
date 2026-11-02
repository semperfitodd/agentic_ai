import AppStoreBadge from './AppStoreBadge';
import { AUTHOR, ORGANIZATION } from '../config/seo';

const Footer = () => (
    <footer className="footer">
        <div className="container footer-inner">
            <p className="footer-credit">
                <span className="footer-dot" aria-hidden="true" />
                <span>
                    Created by{' '}
                    <a href={AUTHOR.url} rel="author" className="footer-author">
                        {AUTHOR.name}
                    </a>
                    , {AUTHOR.jobTitle}, {ORGANIZATION}
                </span>
            </p>
            <AppStoreBadge height={32} />
            <p className="footer-meta">
                <a href="/privacy.html">Privacy</a>
                <a href="/support.html">Support</a>
                <span>Powered by Amazon Bedrock and Amazon Nova</span>
            </p>
        </div>
    </footer>
);

export default Footer;
