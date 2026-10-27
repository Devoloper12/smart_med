import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.util.Arrays;

public class LoginView extends JFrame {
    private final Controller controller = new Controller();
    private final JTextField txtUsername = new JTextField();
    private final JPasswordField txtPassword = new JPasswordField();

    public LoginView() {
        setTitle("Smart Medicine Assistant - Login");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(850, 560);
        setMinimumSize(new Dimension(760, 500));
        setLocationRelativeTo(null);

        JPanel root = new JPanel(new GridLayout(1, 2));
        root.setBackground(new Color(244, 250, 250));

        JPanel visual = new JPanel(new BorderLayout());
        visual.setBackground(new Color(224, 246, 246));
        visual.setBorder(new EmptyBorder(35, 35, 35, 35));
        JLabel image = new JLabel(loadIcon("resources/images/medical_banner.png", 360, 150));
        image.setHorizontalAlignment(SwingConstants.CENTER);
        visual.add(image, BorderLayout.CENTER);
        JLabel slogan = new JLabel("<html><div style='text-align:center'><h1>Smart Medicine Assistant</h1>"
                + "<p>Your health, your medicines, your profile.</p></div></html>", SwingConstants.CENTER);
        slogan.setForeground(new Color(18, 102, 108));
        visual.add(slogan, BorderLayout.SOUTH);

        JPanel form = new JPanel();
        form.setLayout(new BoxLayout(form, BoxLayout.Y_AXIS));
        form.setBackground(Color.WHITE);
        form.setBorder(new EmptyBorder(55, 55, 55, 55));

        JLabel title = new JLabel("Patient Login");
        title.setFont(new Font("SansSerif", Font.BOLD, 28));
        title.setForeground(new Color(18, 102, 108));
        title.setAlignmentX(Component.LEFT_ALIGNMENT);
        form.add(title); form.add(Box.createVerticalStrut(8));
        JLabel sub = new JLabel("Sign in to view your personal medicine schedule");
        sub.setForeground(Color.DARK_GRAY); sub.setAlignmentX(Component.LEFT_ALIGNMENT);
        form.add(sub); form.add(Box.createVerticalStrut(28));

        addField(form, "Username", txtUsername);
        addField(form, "Password", txtPassword);

        JButton login = primaryButton("LOGIN");
        login.setAlignmentX(Component.LEFT_ALIGNMENT);
        login.setMaximumSize(new Dimension(Integer.MAX_VALUE, 42));
        form.add(login); form.add(Box.createVerticalStrut(16));

        JButton register = new JButton("New patient? Create an account");
        register.setBorderPainted(false); register.setContentAreaFilled(false);
        register.setForeground(new Color(18, 102, 108)); register.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        register.setAlignmentX(Component.LEFT_ALIGNMENT);
        form.add(register);

        login.addActionListener(e -> login());
        txtPassword.addActionListener(e -> login());
        register.addActionListener(e -> { new RegisterView().setVisible(true); dispose(); });

        root.add(visual); root.add(form); setContentPane(root);
    }

    private void login() {
        String username = txtUsername.getText().trim();
        char[] password = txtPassword.getPassword();
        if (username.isEmpty() || password.length == 0) {
            JOptionPane.showMessageDialog(this, "Enter username and password.", "Login", JOptionPane.WARNING_MESSAGE);
            return;
        }
        User user = controller.login(username, password);
        Arrays.fill(password, '\0');
        if (user == null) {
            JOptionPane.showMessageDialog(this, "Incorrect username or password.", "Login failed", JOptionPane.ERROR_MESSAGE);
            return;
        }
        Session.setCurrentUser(user);
        new MainView().setVisible(true);
        dispose();
    }

    private static void addField(JPanel panel, String label, JComponent field) {
        JLabel l = new JLabel(label); l.setFont(new Font("SansSerif", Font.BOLD, 13)); l.setAlignmentX(Component.LEFT_ALIGNMENT);
        field.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38)); field.setAlignmentX(Component.LEFT_ALIGNMENT);
        panel.add(l); panel.add(Box.createVerticalStrut(6)); panel.add(field); panel.add(Box.createVerticalStrut(18));
    }

    static JButton primaryButton(String text) {
        JButton b = new JButton(text); b.setBackground(new Color(18, 139, 145)); b.setForeground(Color.WHITE);
        b.setFocusPainted(false); b.setFont(new Font("SansSerif", Font.BOLD, 13)); return b;
    }

    static ImageIcon loadIcon(String path, int w, int h) {
        ImageIcon icon = new ImageIcon(path);
        return new ImageIcon(icon.getImage().getScaledInstance(w, h, Image.SCALE_SMOOTH));
    }
}
