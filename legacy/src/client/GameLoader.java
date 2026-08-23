package client;
import java.util.*;
import javax.imageio.ImageIO;
import javax.swing.*;
import javax.sound.sampled.*;
import java.io.*;
import java.awt.image.*;
import java.awt.*;

public class GameLoader extends JPanel implements Runnable
{
	private static final long serialVersionUID = 1L;
	public int m_screenWidth;
    public int m_screenHeight;
    public static Thread m_gameThread;
    public MediaTracker m_mediaTracker;
    public static Hashtable<String, Object> g_mediaElements;
    public Image[] m_loadingImageArray;
    public GamePanel m_gamePanel;
    public GameLoadingAnimator m_animator;
    private static final int[] ib;
    public Properties m_props;
    public String m_brand;
    
    public void stop() {
        this.m_gamePanel.stopThreads();
        this.threadStop(GameLoader.m_gameThread);
        GameLoader.m_gameThread = null;
    }
    
    public static void sleep(final int n) {
        try {
            Thread.sleep(n);
        }
        catch (InterruptedException ex) {}
    }
    
    public void doLoading() {
        try {
            try {
                //this.m_props.load(new URL(this.getDocumentBase(), (this.getParameter("propfile") == null) ? "prop.txt" : this.getParameter("propfile")).openStream());
            	this.m_props.load(getClass().getResourceAsStream("prop.txt"));
            }
            catch (IOException ex2) {}
            //if (this.getDocumentBase().getHost().equals(this.m_props.getProperty("releaseHost", "b"))) {}
            this.m_brand = this.m_props.getProperty("brand", "Center Fleet");
            final int intProperty = Util.getIntProperty(this.m_props, "NumImgs", 0);
            final int intProperty2 = Util.getIntProperty(this.m_props, "NumSnds", 0);
            final int intProperty3 = Util.getIntProperty(this.m_props, "NumClasses", 0);
            this.m_animator = new GameLoadingAnimator(this, this.m_brand, intProperty3 + intProperty + intProperty2, this.m_screenWidth, this.m_screenHeight);
            new Thread(this.m_animator).start();
            for (int i = 0; i < intProperty; ++i) {
                //this.m_loadingImageArray[i] = this.getImage(this.getCodeBase(), this.m_props.getProperty("IP" + i));
            	this.m_loadingImageArray[i] = ImageIO.read(getClass().getResourceAsStream(this.m_props.getProperty("IP" + i)));
                this.m_mediaTracker.addImage(this.m_loadingImageArray[i], i);
            }
            for (int k = 0; k < intProperty2; ++k) {
            	try {	// If sound device is disabled, AudioSystem.getLine can cause an IllegalArgumentException. There may be other exceptions too.
	            	InputStream audioSrc = getClass().getResourceAsStream(this.m_props.getProperty("SP" + k));
	            	AudioInputStream audioStream = AudioSystem.getAudioInputStream(new BufferedInputStream(audioSrc));
	                DataLine.Info info = new DataLine.Info(Clip.class, audioStream.getFormat());
	                Clip audioClip = (Clip)AudioSystem.getLine(info);
	                audioClip.open(audioStream);
	            	audioClip.start();
	            	GameLoader.g_mediaElements.put(this.m_props.getProperty("SN" + k), audioClip);
	                this.m_animator.notifyLoad();
            	}
            	catch (Exception e) {}
            }
            for (int l = 0; l < intProperty; ++l) {
                this.m_mediaTracker.waitForID(l);
                this.m_animator.notifyLoad();
                Object cutImages = this.m_loadingImageArray[l];
                final int intProperty4 = Util.getIntProperty(this.m_props, "IX" + l, 1);
                if (intProperty4 > 1) {
                    cutImages = this.cutImages(this.m_loadingImageArray[l], intProperty4);
                }
                GameLoader.g_mediaElements.put(this.m_props.getProperty("IN" + l), cutImages);
            }
        }
        catch (Exception ex) {
            ex.printStackTrace();
        }
        sleep(200);
        //this.m_animator.m_bKeepRunning = false;
        this.setLayout(null);
        this.add(this.m_gamePanel = new GamePanel(this.m_props, this, this.m_screenWidth, this.m_screenHeight));
        this.m_gamePanel.validate();
        this.validate();
        this.repaint();
    }
    
    public GameLoader() {
        this.m_loadingImageArray = new Image[64];
        this.m_props = new Properties();
        init();
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    static {
        GameLoader.g_mediaElements = new Hashtable();
        ib = new int[2];
    }
    
    public void start() {
        if (GameLoader.m_gameThread == null) {
            (GameLoader.m_gameThread = new Thread(this)).start();
        }
    }
    
    void threadStop(final Thread thread) {
        if (thread != null && thread.isAlive()) {
            thread.stop();
        }
    }
    
    public Image[] cutImages(final Image image, final int n) {
        final Image[] array = new Image[n];
        final int n2 = (image.getWidth(null) - n - 1) / n;
        final ImageProducer source = image.getSource();
        for (int i = 0; i < n; ++i) {
            array[i] = this.createImage(new FilteredImageSource(source, new CropImageFilter(i + i * n2 + 1, 1, n2, image.getHeight(null) - 2)));
            this.m_mediaTracker.addImage(array[i], 500);
        }
        try {
            this.m_mediaTracker.waitForAll();
        }
        catch (Exception ex) {}
        return array;
    }
    
    public void run() {
        this.doLoading();
        try {
            while (true) {
                this.m_gamePanel.doOneCycle();
            }
        }
        catch (Exception ex) {
            ex.printStackTrace();
        }
    }
    
    public void init() {
        //System.out.println("Loader v1.0");
        this.setBackground(Color.black);
        this.setForeground(Color.white);
        this.m_screenWidth = 1150;
        this.m_screenHeight = 750;
        this.m_mediaTracker = new MediaTracker(this);
        this.repaint();
    }
    
    public static void main (String [] args) {
        JFrame frame = new JFrame();
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.setResizable(false);
        
        frame.setBounds(20, 20, 1150, 750);
        frame.setTitle("Wormhole Redux");
        
        GameLoader gameLoader = new GameLoader();
        frame.setContentPane(gameLoader);
        frame.setVisible(true);
        gameLoader.start();
    }
}
