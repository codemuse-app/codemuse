import Image from 'next/image';
import confetti from "@/assets/confetti.png";
import Link from 'next/link'; 

const ProSubscriptionPage = () => {
  return (
    <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>

        <Image 
          src={confetti} // Replace with your image path
          alt="Confetti"
          width={300}  // Adjust the width as needed
          height={300} // Adjust the height as needed
          layout="fixed"
        />
      </div>
      <h1 style={{fontSize:"50px"}}>Congratulations !</h1>
      <h3 style={{fontSize:"25px"}}>You have successfully subscribed to the Pro Plan !</h3>
      <div className="mt-5">
        <Link href="/login" passHref>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Home
          </button>
        </Link>
      </div>
    </div>
  );
};

export default ProSubscriptionPage;