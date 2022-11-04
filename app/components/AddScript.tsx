const AddScript = ({ onAddScript } : any) => {

    const onSubmit = (e : any) => {
        
        e.preventDefault() // prevent full page refresh
        onAddScript()
    } 

    return (

        <form onSubmit={onSubmit}>
            <div>
                <p><b>Add Script to Blockchain </b></p>
            </div>
            <input type='submit' value='Add Script'/>
        </form>
    )
}

export default AddScript