import AppStoreBadge from './AppStoreBadge';

const Footer = () => (
    <footer className="footer">
        <div className="container footer-inner">
            <p>
                <span className="footer-dot" aria-hidden="true" />
                BSC Analytics · Todd Bernson, Chief AI Officer
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
