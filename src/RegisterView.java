import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.util.Arrays;

public class RegisterView extends JFrame {
    private final Controller controller = new Controller();
    private final JTextField username = new JTextField();
    private final JPasswordField password = new JPasswordField();
    private final JPasswordField confirm = new JPasswordField();
    private final JTextField name = new JTextField();
    private final JTextArea allergies = new JTextArea(3, 20);
    private final JTextField caregiver = new JTextField();

    public RegisterView() {
        setTitle("Smart Medicine Assistant - Register"); setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(700, 720); setLocationRelativeTo(null);
        JPanel root = new JPanel(new BorderLayout(15,15)); root.setBackground(new Color(244,250,250)); root.setBorder(new EmptyBorder(25,45,25,45));
        JLabel head = new JLabel("Create Patient Account", LoginView.loadIcon("resources/images/medical_logo.png", 70,70), SwingConstants.LEFT);
        head.setFont(new Font("SansSerif", Font.BOLD, 26)); head.setForeground(new Color(18,102,108)); root.add(head, BorderLayout.NORTH);

        JPanel form = new JPanel(); form.setLayout(new BoxLayout(form, BoxLayout.Y_AXIS)); form.setBackground(Color.WHITE); form.setBorder(new EmptyBorder(22,28,22,28));
        add(form,"Username",username); add(form,"Password",password); add(form,"Confirm Password",confirm); add(form,"Patient Name",name);
        JLabel a = new JLabel("Allergies (separate with commas)"); a.setFont(new Font("SansSerif",Font.BOLD,13)); a.setAlignmentX(Component.LEFT_ALIGNMENT); form.add(a); form.add(Box.createVerticalStrut(5));
        allergies.setLineWrap(true); allergies.setWrapStyleWord(true); JScrollPane sp=new JScrollPane(allergies); sp.setAlignmentX(Component.LEFT_ALIGNMENT); sp.setMaximumSize(new Dimension(Integer.MAX_VALUE,75)); form.add(sp); form.add(Box.createVerticalStrut(14));
        add(form,"Caregiver Contact",caregiver);
        JLabel note = new JLabel("<html><i>Allergy checking is a prototype stored-name match, not medical diagnosis.</i></html>"); note.setForeground(new Color(120,80,40)); note.setAlignmentX(Component.LEFT_ALIGNMENT); form.add(note); form.add(Box.createVerticalStrut(16));
        JButton create=LoginView.primaryButton("CREATE ACCOUNT"); create.setAlignmentX(Component.LEFT_ALIGNMENT); create.setMaximumSize(new Dimension(Integer.MAX_VALUE,42)); form.add(create); form.add(Box.createVerticalStrut(8));
        JButton back=new JButton("Back to Login"); back.setContentAreaFilled(false); back.setBorderPainted(false); back.setForeground(new Color(18,102,108)); back.setAlignmentX(Component.LEFT_ALIGNMENT); form.add(back);
        create.addActionListener(e->register()); back.addActionListener(e->{new LoginView().setVisible(true); dispose();});
        root.add(form,BorderLayout.CENTER); setContentPane(root);
    }

    private void register(){
        String u=username.getText().trim(), n=name.getText().trim(); char[] p=password.getPassword(), c=confirm.getPassword();
        if(u.isEmpty()||n.isEmpty()||p.length==0){JOptionPane.showMessageDialog(this,"Username, password and patient name are required.");return;}
        if(!Arrays.equals(p,c)){JOptionPane.showMessageDialog(this,"Passwords do not match.");return;}
        if(p.length<6){JOptionPane.showMessageDialog(this,"Use a password with at least 6 characters.");return;}
        try{
            User user=controller.registerUser(u,p,n,allergies.getText(),caregiver.getText()); Arrays.fill(p,'\0'); Arrays.fill(c,'\0');
            Session.setCurrentUser(user); JOptionPane.showMessageDialog(this,"Account created successfully."); new MainView().setVisible(true); dispose();
        }catch(DuplicateUsernameException ex){
            JOptionPane.showMessageDialog(this, ex.getMessage(), "Registration", JOptionPane.WARNING_MESSAGE);
        }catch(Exception ex){
            ex.printStackTrace();
            JOptionPane.showMessageDialog(this, "Could not create account. Check MongoDB connection.", "Database Error", JOptionPane.ERROR_MESSAGE);
        }
    }
    private static void add(JPanel p,String text,JComponent field){JLabel l=new JLabel(text);l.setFont(new Font("SansSerif",Font.BOLD,13));l.setAlignmentX(Component.LEFT_ALIGNMENT);field.setAlignmentX(Component.LEFT_ALIGNMENT);field.setMaximumSize(new Dimension(Integer.MAX_VALUE,36));p.add(l);p.add(Box.createVerticalStrut(5));p.add(field);p.add(Box.createVerticalStrut(14));}
}
