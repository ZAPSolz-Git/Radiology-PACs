import Navbar from "@/components/Navbar";
import Homepage from "../components/Homepage";
import Blogs from "../components/Blogs";
import Testimonials from "../components/Testimonials";
import Footer from "../components/Footer";
import ScrollToTopButton from "../components/ScrollToTopButton";

const Home = () => {
    return (
        <>
            <Navbar />
            <Homepage />
            <Blogs />
            <Testimonials />
            <Footer />
            <ScrollToTopButton />
        </>
    );
};

export default Home;
